const express = require('express');
const app = express();
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const con = require('./db');
const JWT_KEY = 'ProjEctMyApp';

app.use('/upload', express.static('upload'))
app.use(cors());
app.use(express.json());


var storage = multer.diskStorage({
    // uploaded folder
    destination: function (req, file, cb) {
        cb(null, 'upload');
    },
    filename: function (req, file, cb) {
        // rename the uploaded file with prefix timestamp
        // cb(null, Date.now() + '-' + file.originalname);
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
// upload and limit to 1 MB
const upload = multer({ storage: storage }).single('image');


function verifyToken(req, res, next) {
    let token = req.headers['authorization'];
    if (!token) return res.status(401).json({ message: 'Token is required' });

    if (token.startsWith('Bearer ')) token = token.slice(7);

    jwt.verify(token, JWT_KEY, (err, decoded) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        console.log('Decoded token:', decoded);
        req.decoded = decoded;
        next();
    });
}

function authorizeRole(requiredRole) {
    return (req, res, next) => {
        const { role } = req.decoded;
        if (role !== requiredRole) {
            return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
}


app.get('/password/:raw', (req, res) => {
    const raw = req.params.raw;
    bcrypt.hash(raw, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: 'Error hashing password' });
        res.json({ hash });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const sql = "SELECT * FROM users WHERE username = ?";
    con.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        if (results.length === 0) {
            return res.status(401).json({ message: 'Incorrect username or password' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect username or password' });
        }

        const token = jwt.sign(
            { user_id: user.id, username: user.username, role: user.role },
            JWT_KEY,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, role: user.role },
        });
    });
});

app.post('/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: 'Error hashing password' });

        const sql = "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, 'student')";
        con.query(sql, [username, hash, email], (err, result) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.status(201).json({ message: 'Registration successful' });
        });
    });
});

app.post('/student/history', verifyToken, (req, res) => {
    const { user_id, role } = req.decoded;

    console.log("Decoded JWT Payload:", { user_id, role });

    if (role !== 'student') {
        console.log("Access denied: User role is not 'student'.");
        return res.status(403).json({ message: 'Access denied' });
    }

    const query = `
        SELECT 
            b.book_name,
            CONCAT('assets/images/', b.image) AS book_image,
            h.borrow_date,
            h.return_date,
            h.request_date,
            h.approve_date,
            CASE
                WHEN h.approve_date IS NULL THEN 'Pending Approval'
                WHEN h.returner_id IS NULL THEN 'Borrowed'
                ELSE 'Returned'
            END AS display_status
        FROM history h
        JOIN book b ON h.book_id = b.id
        WHERE h.borrower_id = ?
        ORDER BY h.borrow_date DESC
    `;

    con.query(query, [user_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        console.log("Query Results:", results);

        if (results.length === 0) {
            console.log("No requests found for user_id:", user_id);
            return res.status(404).json({ message: 'No requests found' });
        }

        console.log("Returning results to client:", results);
        res.json(results);
    });
});

app.post('/lender/history', verifyToken, (req, res) => {
    const { user_id, role } = req.decoded;

    console.log("Decoded JWT Payload:", { user_id, role });

    if (role !== 'lender') {
        console.log("Access denied: User role is not 'lender'.");
        return res.status(403).json({ message: 'Access denied' });
    }

    const query = `
        SELECT 
            b.book_name,
            CONCAT('assets/images/', b.image) AS book_image,
            h.borrow_date,
            h.return_date,
            h.approve_date,
            h.request_date,
            h.approver_id,
            CASE
                WHEN h.approve_date IS NULL THEN 'Pending Approval'
                WHEN h.returner_id IS NULL THEN 'Borrowed'
                ELSE 'Returned'
            END AS display_status
        FROM history h
        JOIN book b ON h.book_id = b.id
        WHERE h.approver_id = ?
        ORDER BY h.borrow_date ASC
    `;

    con.query(query, [user_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        console.log("Query Results:", results);

        if (results.length === 0) {
            console.log("No requests found for user_id:", user_id);
            return res.status(404).json({ message: 'No requests found' });
        }

        console.log("Returning results to client:", results);
        res.json(results);
    });
});

app.post('/staff/history', verifyToken, (req, res) => {
    const { user_id, role } = req.decoded;

    console.log("Decoded JWT Payload:", { user_id, role });

    if (role !== 'staff') {
        console.log("Access denied: User role is not 'staff'.");
        return res.status(403).json({ message: 'Access denied' });
    }

    const query = `
        SELECT 
            b.book_name,
            CONCAT('assets/images/', b.image) AS book_image,
            h.borrow_date,
            h.return_date,
            h.approve_date,
            h.request_date,
            borrower.username AS borrower_name,
            approver.username AS approver_name,
            returner.username AS returner_name,
            CASE
                WHEN h.approve_date IS NULL THEN 'Pending Approval'
                WHEN h.returner_id IS NULL THEN 'Borrowed'
                ELSE 'Returned'
            END AS display_status
        FROM history h
        JOIN book b ON h.book_id = b.id
        JOIN users borrower ON h.borrower_id = borrower.id
        LEFT JOIN users approver ON h.approver_id = approver.id 
        LEFT JOIN users returner ON h.returner_id = returner.id
        ORDER BY h.borrow_date ASC
    `;

    con.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        console.log("Query Results:", results);

        if (results.length === 0) {
            console.log("No history records found.");
            return res.status(404).json({ message: 'No history records found' });
        }

        console.log("Returning results to client:", results);
        res.json(results);
    });
});

app.post('/staff/get_return', verifyToken, (req, res) => {
    const { user_id, role } = req.decoded;

    if (role !== 'staff') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const sql = `
        SELECT 
            b.id AS book_id,
            b.book_name,
            CONCAT('assets/images/', b.image) AS book_image,
            'borrowed' AS display_status,
            h.borrow_date,
            h.return_date,
            h.approve_date,
            h.request_date,
            h.approver_id
        FROM history h
        JOIN book b ON h.book_id = b.id
        WHERE b.status = 'borrowed'
        ORDER BY h.borrow_date ASC
    `;

    con.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results.map(item => ({
            book_id: item.book_id,
            book_name: item.book_name,
            book_image: item.book_image || null,
            display_status: item.display_status,
            borrow_date: item.borrow_date || 'N/A',
            return_date: item.return_date || 'N/A',
            request_date: item.request_date || 'N/A',
            approve_date: item.approve_date || 'N/A',
        })));
        console.log(sql);
    });
});


app.post('/staff/confirm_return', verifyToken, (req, res) => {
    const { user_id, book_id } = req.body;

    if (!user_id || !book_id) {
        return res.status(400).json({ message: 'User ID and Book ID are required' });
    }

    const updateHistorySql = `
        UPDATE history 
        SET returner_id = ? 
        WHERE book_id = ? AND returner_id IS NULL
    `;
    const updateBookSql = `
        UPDATE book 
        SET status = 'available' 
        WHERE id = ?
    `;

    con.beginTransaction((err) => {
        if (err) return res.status(500).json({ message: 'Transaction error' });

        con.query(updateHistorySql, [user_id, book_id], (err, result) => {
            if (err || result.affectedRows === 0) {
                return con.rollback(() => {
                    res.status(500).json({ message: 'Failed to update history table' });
                });
            }

            con.query(updateBookSql, [book_id], (err, result) => {
                if (err || result.affectedRows === 0) {
                    return con.rollback(() => {
                        res.status(500).json({ message: 'Failed to update book status' });
                    });
                }

                con.commit((err) => {
                    if (err) {
                        return con.rollback(() => {
                            res.status(500).json({ message: 'Transaction commit error' });
                        });
                    }
                    res.json({ message: 'Return confirmed successfully!' });
                });
            });
        });
    });
});

app.get('/student/checkreq', verifyToken, (req, res) => {
    console.log("Received request at /student/checkreq");

    const { user_id, role } = req.decoded;
    console.log("Decoded JWT Payload:", { user_id, role });

    if (role !== 'student') {
        console.log("Access denied: User role is not 'student'.");
        return res.status(403).json({ message: 'Access denied' });
    }

    const query = `
        SELECT 
            b.book_name,
            CONCAT('assets/images/', b.image) AS book_image,
            h.borrow_date,
            h.return_date,
            h.approve_date,
            CASE
                WHEN h.approve_date IS NULL THEN 'Pending Approval'
                WHEN h.returner_id IS NULL THEN 'Borrowed'
                ELSE 'Returned'
            END AS display_status
        FROM history h
        JOIN book b ON h.book_id = b.id
        WHERE h.borrower_id = ?
        ORDER BY h.borrow_date DESC
    `;

    con.query(query, [user_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        console.log("Query Results:", results);
        if (results.length === 0) {
            console.log("No requests found for user_id:", user_id);
            return res.status(404).json({ message: 'No requests found' });
        }

        console.log("Returning results to client:", results);
        res.json(results);
    });
});

app.get('/lender/borrowreq', verifyToken, (req, res) => {
    console.log("Received request at /lender/borrowreq");

    const { role } = req.decoded;
    console.log("Decoded JWT Payload:", { role });

    if (role !== 'lender') {
        console.log("Access denied: User role is not 'lender'.");
        return res.status(403).json({ message: 'Access denied' });
    }

    const query = `
    SELECT 
        b.id AS book_id,
        b.book_name,
        b.status,
        CONCAT('assets/images/', b.image) AS book_image,
        h.id AS history_id,
        h.borrower_id,
        h.request_date,
        h.borrow_date,
        h.return_date
    FROM book b
    JOIN history h ON b.id = h.book_id
    WHERE b.status = 'pending' AND h.approve_date IS NULL
    ORDER BY b.book_name ASC
`;


    con.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            console.log("No pending books found.");
            return res.status(404).json({ message: 'No pending books found.' });
        }

        console.log("Returning pending books:", results);
        res.json(results);
    });
});

app.post('/request/approve', verifyToken, (req, res) => {
    console.log("Received request at /request/approve");

    const { role } = req.decoded;
    console.log("Decoded JWT Payload:", { role });

    if (role !== 'lender') {
        console.log("Access denied: User role is not 'lender'.");
        return res.status(403).json({ message: 'Access denied. Only lenders can approve requests.' });
    }

    const { book_id, borrower_id, borrow_date, return_date } = req.body;

    if (!book_id || !borrower_id || !borrow_date || !return_date) {
        console.log("Missing fields:", { book_id, borrower_id, borrow_date, return_date });
        return res.status(400).json({ message: 'All fields (book_id, borrower_id, borrow_date, return_date) are required.' });
    }

    const checkBookQuery = `SELECT * FROM book WHERE id = ? AND status = 'pending'`;
    const updateBookQuery = `UPDATE book SET status = 'borrowed' WHERE id = ?`;
    const updateHistoryQuery = `
        UPDATE history
        SET request_status = 'approve', approver_id = ?, approve_date = CURDATE(), borrow_date = ?, return_date = ?
        WHERE book_id = ? AND borrower_id = ? AND request_status IS NULL
    `;


    con.query(checkBookQuery, [book_id], (err, bookResults) => {
        if (err) {
            console.error('Database query error while checking book:', err);
            return res.status(500).json({ message: 'Internal server error.' });
        }

        if (bookResults.length === 0) {
            console.log(`Book not found or not in pending state: book_id=${book_id}`);
            return res.status(400).json({ message: 'Book is not available for approval.' });
        }

        con.query(updateBookQuery, [book_id], (updateErr) => {
            if (updateErr) {
                console.error('Error updating book status:', updateErr);
                return res.status(500).json({ message: 'Error updating book status.' });
            }

            console.log(`Book status updated to 'borrowed' for book_id: ${book_id}`);

            con.query(
                updateHistoryQuery,
                [req.decoded.user_id, borrow_date, return_date, book_id, borrower_id],
                (historyErr, historyResults) => {
                    if (historyErr) {
                        console.error('Error updating history record:', historyErr);

                        con.query(`UPDATE book SET status = 'pending' WHERE id = ?`, [book_id], (rollbackErr) => {
                            if (rollbackErr) {
                                console.error('Error rolling back book status update:', rollbackErr);
                            }
                        });

                        return res.status(500).json({ message: 'Error approving the request.' });
                    }

                    if (historyResults.affectedRows === 0) {
                        console.log('No matching history record found for approval.');
                        return res.status(404).json({ message: 'No matching history record found for approval.' });
                    }

                    console.log('Request approved successfully.');
                    res.status(200).json({ message: 'Request approved successfully.' });
                }
            );
        });
    });
});

app.post('/request/disapprove', verifyToken, (req, res) => {
    console.log("Received request at /request/disapprove");

    const { role } = req.decoded;
    console.log("Decoded JWT Payload:", { role });

    if (role !== 'lender') {
        console.log("Access denied: User role is not 'lender'.");
        return res.status(403).json({ message: 'Access denied. Only lenders can approve requests.' });
    }

    const { book_id, borrower_id, borrow_date, return_date } = req.body;

    if (!book_id || !borrower_id || !borrow_date || !return_date) {
        console.log("Missing fields:", { book_id, borrower_id, borrow_date, return_date });
        return res.status(400).json({ message: 'All fields (book_id, borrower_id, borrow_date, return_date) are required.' });
    }

    const checkBookQuery = `SELECT * FROM book WHERE id = ? AND status = 'pending'`;
    const updateBookQuery = `UPDATE book SET status = 'available' WHERE id = ?`;
    const updateHistoryQuery = `
        UPDATE history
        SET request_status = 'disapprove', approver_id = ?, approve_date = CURDATE(), borrow_date = ?, return_date = ?
        WHERE book_id = ? AND borrower_id = ? AND request_status IS NULL
    `;


    con.query(checkBookQuery, [book_id], (err, bookResults) => {
        if (err) {
            console.error('Database query error while checking book:', err);
            return res.status(500).json({ message: 'Internal server error.' });
        }

        if (bookResults.length === 0) {
            console.log(`Book not found or not in pending state: book_id=${book_id}`);
            return res.status(400).json({ message: 'Book is not available for approval.' });
        }

        con.query(updateBookQuery, [book_id], (updateErr) => {
            if (updateErr) {
                console.error('Error updating book status:', updateErr);
                return res.status(500).json({ message: 'Error updating book status.' });
            }

            console.log(`Book status updated to 'borrowed' for book_id: ${book_id}`);

            con.query(
                updateHistoryQuery,
                [req.decoded.user_id, borrow_date, return_date, book_id, borrower_id],
                (historyErr, historyResults) => {
                    if (historyErr) {
                        console.error('Error updating history record:', historyErr);

                        con.query(`UPDATE book SET status = 'available' WHERE id = ?`, [book_id], (rollbackErr) => {
                            if (rollbackErr) {
                                console.error('Error rolling back book status update:', rollbackErr);
                            }
                        });

                        return res.status(500).json({ message: 'Error approving the request.' });
                    }

                    if (historyResults.affectedRows === 0) {
                        console.log('No matching history record found for approval.');
                        return res.status(404).json({ message: 'No matching history record found for approval.' });
                    }

                    console.log('Request approved successfully.');
                    res.status(200).json({ message: 'Request disapproved successfully.' });
                }
            );
        });
    });
});

app.get('/books', verifyToken, (req, res) => {
    console.log("Incoming request to /books");

    const query = 'SELECT * FROM book';

    con.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching books:', err);
            res.status(500).json({ error: 'Database error', details: err.message });
            return;
        }
        const books = results.map(book => ({
            id: book.id,
            book_name: book.book_name,
            image: `upload/${book.image}`,
            status: book.status,
        }));

        res.json(books);
    });
});


app.patch('/books', verifyToken, (req, res) => {
    const { bookId, book_name, status } = req.body;

    if (!bookId) {
        return res.status(400).json({ message: 'Book ID is required' });
    }
    // ตรวจสอบสถานะของหนังสือในฐานข้อมูลก่อน
    const checkQuery = 'SELECT status FROM book WHERE id = ?';
    con.query(checkQuery, [bookId], (err, results) => {
        if (err) {
            console.error('Error fetching book status:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const currentStatus = results[0].status;
        // ตรวจสอบว่าห้ามแก้ไขถ้าสถานะเป็น borrowed หรือ pending
        if (currentStatus === 'borrowed' || currentStatus === 'pending') {
            return res.status(403).json({ message: 'Cannot update book because it is borrowed or pending' });
        }

        // อัปเดตข้อมูลในฐานข้อมูล
        const updateQuery = 'UPDATE book SET book_name = ?, status = ? WHERE id = ?';
        con.query(updateQuery, [book_name || null, status || null, bookId], (err, updateResults) => {
            if (err) {
                console.error('Error updating book:', err);
                return res.status(500).json({ error: 'Database error', details: err.message });
            }

            if (updateResults.affectedRows === 0) {
                return res.status(404).json({ error: 'Book not found' });
            }

            res.json({ message: 'Book updated successfully' });
        });
    });
});


app.post('/books', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.error('Upload Error:', err);
            return res.status(500).json({ message: 'File upload failed', error: err.message });
        }
        console.log('File Uploaded:', req.file); // ตรวจสอบไฟล์ที่อัปโหลด
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { book_name, status } = req.body;
        const image = req.file.filename;

        if (!book_name || !status || !image) {
            return res.status(400).json({ message: 'Book name, status, and image are required' });
        }

        // Insert the new book data into the database
        const sql = "INSERT INTO book (book_name, status, image) VALUES (?, ?, ?)";
        con.query(sql, [book_name, status, image], (err, result) => {
            if (err) {
                console.error('Error adding book:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            res.status(201).json({ message: 'Book added successfully!', id: result.insertId });
        });
    });
});


function convertToDatabaseDateFormat(dateString) {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
}



app.post('/request', (req, res) => {
    const { book_id, borrower_id, borrow_date, return_date } = req.body;

    const borrowDate = convertToDatabaseDateFormat(borrow_date);
    const returnDate = convertToDatabaseDateFormat(return_date);
    console.log("Request received:", { book_id, borrower_id, borrowDate, returnDate });

    if (!book_id || !borrower_id || !borrow_date || !return_date) {
        console.log("Missing fields:", { book_id, borrower_id, borrowDate, returnDate });
        return res.status(400).json({ status: 'error', message: 'All fields are required' });
    }

    let user_id;
    try {

        const decoded = jwt.verify(borrower_id, JWT_KEY);
        user_id = decoded.user_id;
        console.log("Decoded borrower_id:", decoded);
    } catch (error) {
        console.error("Invalid borrower_id:", borrower_id, error);
        return res.status(400).json({ status: 'error', message: 'Invalid borrower_id' });
    }

    const checkBookQuery = `SELECT * FROM book WHERE id = ? AND status = 'available'`;
    con.query(checkBookQuery, [book_id], (error, bookResults) => {
        if (error) {
            console.error('Database query error while checking book:', error);
            return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
        }
        if (bookResults.length === 0) {
            console.log(`Invalid or unavailable book_id: ${book_id}`);
            return res.status(400).json({ status: 'error', message: 'Book is not available for borrowing' });
        }

        const updateBookQuery = `UPDATE book SET status = 'pending' WHERE id = ?`;
        con.query(updateBookQuery, [book_id], (updateError) => {
            if (updateError) {
                console.error('Error updating book status:', updateError);
                return res.status(500).json({ status: 'error', message: 'Error updating book status' });
            }

            console.log(`Book status updated to 'pending' for book_id: ${book_id}`);

            const insertHistoryQuery = `
                INSERT INTO history (book_id, borrower_id, request_status, request_date, borrow_date, return_date, approve_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const requestDate = new Date().toISOString().split('T')[0];
            con.query(insertHistoryQuery, [
                book_id,
                user_id,
                null,
                requestDate,
                borrowDate,
                returnDate,
                null
            ], (insertError, results) => {
                if (insertError) {
                    console.error('Error inserting request into history:', insertError);

                    const rollbackBookQuery = `UPDATE book SET status = 'available' WHERE id = ?`;
                    con.query(rollbackBookQuery, [book_id], (rollbackError) => {
                        if (rollbackError) {
                            console.error('Error rolling back book status update:', rollbackError);
                        }
                    });

                    return res.status(500).json({ status: 'error', message: 'Error logging request into history' });
                }

                console.log('Request successfully logged into history:', results);
                res.status(200).json({ status: 'success', message: 'Request submitted successfully and book status updated' });
            });
        });
    });
});


app.post('/check-pending-request', (req, res) => {
    const { borrower_id } = req.body;
    const today = new Date().toISOString().split('T')[0];

    con.query(
        'SELECT * FROM history WHERE borrower_id = ? AND DATE(request_date) = ?',
        [borrower_id, today],
        (error, results) => {
            if (error) {
                return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
            }

            if (results.length > 0) {
                return res.status(200).json({ status: 'error', message: 'You can only borrow one asset per day.' });
            } else {
                return res.status(200).json({ status: 'success' });
            }
        }
    );
});
app.get('/staff/dashboard', verifyToken, (req, res) => {
    console.log('Dashboard API called'); // Log the API call

    const metrics = {};
    const queries = [
        'SELECT COUNT(*) AS availableBooks FROM book WHERE status = "available"',
        'SELECT COUNT(*) AS borrowedBooks FROM book WHERE status = "borrowed"',
        'SELECT COUNT(*) AS pendingBooks FROM book WHERE status = "pending"',
        'SELECT COUNT(*) AS disabledBooks FROM book WHERE status = "disabled"',
        'SELECT COUNT(*) AS booksBorrowedToday FROM history WHERE DATE(borrow_date) = CURDATE()',
        'SELECT COUNT(*) AS returnsToday FROM history WHERE DATE(return_date) = CURDATE()'
    ];

    let completedQueries = 0;

    queries.forEach((query, index) => {
        console.log(`Executing query: ${query}`); // Log each query
        con.query(query, (err, result) => {
            if (err) {
                console.error('Database error while executing query:', query, err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            }

            console.log(`Query result for query ${query}:`, result); // Log query result

            const metricKeyMatch = query.match(/AS (\w+)/i); // Extract alias
            if (metricKeyMatch) {
                const metricKey = metricKeyMatch[1]; // Extract the alias
                metrics[metricKey] = result[0][metricKey] || 0; // Use 0 as fallback
            }

            completedQueries++;

            if (completedQueries === queries.length) {
                console.log('Final metrics:', metrics); // Log final metrics before sending response
                res.json(metrics);
            }
        });
    });
});

app.get('/lender/dashboard', verifyToken, (req, res) => {
    console.log('Dashboard API called'); // Log the API call

    const metrics = {};
    const queries = [
        'SELECT COUNT(*) AS availableBooks FROM book WHERE status = "available"',
        'SELECT COUNT(*) AS borrowedBooks FROM book WHERE status = "borrowed"',
        'SELECT COUNT(*) AS pendingBooks FROM book WHERE status = "pending"',
        'SELECT COUNT(*) AS disabledBooks FROM book WHERE status = "disabled"'
    ];

    let completedQueries = 0;

    queries.forEach((query, index) => {
        console.log(`Executing query: ${query}`); // Log each query
        con.query(query, (err, result) => {
            if (err) {
                console.error('Database error while executing query:', query, err);
                return res.status(500).json({ message: 'Database error', error: err.message });
            }

            console.log(`Query result for query ${query}:`, result); // Log query result

            const metricKeyMatch = query.match(/AS (\w+)/i); // Extract alias
            if (metricKeyMatch) {
                const metricKey = metricKeyMatch[1]; // Extract the alias
                metrics[metricKey] = result[0][metricKey] || 0; // Use 0 as fallback
            }

            completedQueries++;

            if (completedQueries === queries.length) {
                console.log('Final metrics:', metrics); // Log final metrics before sending response
                res.json(metrics);
            }
        });
    });
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
