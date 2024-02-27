const express = require('express');
const path = require('path');
const session = require('express-session');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;


// Set up the database connection
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jobboard'
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session middleware
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up the views directory
app.set('views', path.join(__dirname, 'views'));

// Set the view engine to render HTML
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Define a route to serve the index.html page
app.get('/', (req, res) => {
     // Fetch data from the jobs table
     db.query('SELECT * FROM jobs', (err, results) => {
        if (err) {
            console.error('Error fetching data from database:', err);
            res.status(500).send('Error fetching data');
            return;
        }
        const numberOfJobs = results.length;
        // Render the index template and pass the fetched data to it
        res.render('index', { jobs: results, numberOfJobs });
    });
});


// Route to display details of a specific job and its associated user
app.get('/moreDetail/:id', (req, res) => {
    // Get the job ID from the URL parameters
    const jobId = req.params.id;

    // Fetch data for the job with the specified ID from the database
    db.query('SELECT * FROM jobs WHERE id = ?', [jobId], (err, jobResults) => {
        if (err) {
            console.error('Error fetching job details from database:', err);
            res.status(500).send('Error fetching job details');
            return;
        }

        // Check if a job with the specified ID was found
        if (jobResults.length === 0) {
            res.status(404).send('Job not found');
            return;
        }

        // Extract user ID associated with the job
        const userId = jobResults[0].id_user;

        // Fetch data for the user with the specified ID from the database
        db.query('SELECT * FROM user WHERE id = ?', [userId], (err, userResults) => {
            if (err) {
                console.error('Error fetching user details from database:', err);
                res.status(500).send('Error fetching user details');
                return;
            }

            // Check if a user with the specified ID was found
            if (userResults.length === 0) {
                res.status(404).send('User not found');
                return;
            }

            // Render the job details page with the fetched job and user data
            res.render('detailleJob', { job: jobResults[0], user: userResults[0] });
        });
    });
});

// Route to display details of a specific job and its associated user
app.get('/consulteJob/:id', (req, res) => {
    // Get the job ID from the URL parameters
    const jobId = req.params.id;

    // Fetch data for the job with the specified ID from the database
    db.query('SELECT * FROM jobs WHERE id = ?', [jobId], (err, jobResults) => {
        if (err) {
            console.error('Error fetching job details from database:', err);
            res.status(500).send('Error fetching job details');
            return;
        }

        // Check if a job with the specified ID was found
        if (jobResults.length === 0) {
            res.status(404).send('Job not found');
            return;
        }

        // Extract user ID associated with the job
        const userId = jobResults[0].id_user;

        // Fetch data for the user with the specified ID from the database
        db.query('SELECT * FROM user WHERE id = ?', [userId], (err, userResults) => {
            if (err) {
                console.error('Error fetching user details from database:', err);
                res.status(500).send('Error fetching user details');
                return;
            }

            // Check if a user with the specified ID was found
            if (userResults.length === 0) {
                res.status(404).send('User not found');
                return;
            }

            // Render the job details page with the fetched job and user data
            res.render('consultJob', { job: jobResults[0], user: userResults[0] });
        });
    });
});




app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Register route
app.post('/register', async (req, res) => {
    const { name, prename, email, password } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into database
    const user = { name, prename, email, password: hashedPassword };
    db.query('INSERT INTO user SET ?', user, (err, result) => {
        if (err) {
            res.status(500).send('Error registering user');
            return;
        }
        // Redirect to login page
        res.redirect('/login');
    });
});


// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM user WHERE email = ?', [email], async (err, results) => {
        if (err) {
            res.status(500).send('Error logging in');
            return;
        }

        if (results.length === 0) {
            res.status(401).send('Invalid email or password');
            return;
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            res.status(401).send('Invalid email or password');
            return;
        }

        // Store user data in session
        req.session.user = user;

        // Redirect to dashboard
        res.redirect('/dashboard');
    });
});

// Route to display jobs associated with the logged-in user
app.get('/dashboard', (req, res) => {
    // Check if user is authenticated (session exists)
    if (!req.session.user) {
        return res.sendFile(path.join(__dirname, 'views', 'login.html'));
    }

    // Fetch jobs associated with the logged-in user from the database
    const userId = req.session.user.id; // Assuming the user object has an 'id' property
    db.query('SELECT * FROM jobs WHERE id_user = ?', [userId], (err, results) => {
        if (err) {
            console.error('Error fetching jobs from database:', err);
            return res.status(500).send('Error fetching jobs');
        }
        
        // Calculate the number of jobs
        const numberOfJobs = results.length;

        // Render the dashboard with the fetched jobs and the number of jobs
        res.render('dashboard', { jobs: results, numberOfJobs }); // Assuming you have a 'dashboard.ejs' template
    });
});

// Route  insert job into the database
app.post('/addJob', (req, res) => {
    const { title, numberOfPositions, jobType, experience, expirationDate, field, jobDescription, jobRequirements } = req.body;
    const userId = req.session.user.id;

    // Prepare SQL query with placeholders
    const sql = "INSERT INTO jobs (title, type_contrat, nbr_exprience, nbr_postion, date_exp, field, description, requirement, id_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

    // Prepare data for insertion
    const values = [ title, jobType, experience, numberOfPositions, expirationDate, field, jobDescription, jobRequirements, userId];

    // Execute the query
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error inserting job into database:', err);
            res.status(500).send('Error adding job');
            return;
        }
        res.redirect('/dashboard'); // Redirect to dashboard after successfully adding the job
    });

});

// Job route

app.get('/newJob', (req, res) => {
    // Check if user is authenticated (session exists)
    if (!req.session.user) {
        res.sendFile(path.join(__dirname, 'views', 'login.html'));
    }

    // Render the form jobs
    res.sendFile(path.join(__dirname, 'views', 'addJob.html'));
});

// Logout route
app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Error logging out');
            return;
        }
        // Redirect to the login page after logout
        res.redirect('/login');
    });
});
// Route to display details of a specific job
app.get('/job/:id', (req, res) => {
    if (!req.session.user) {
        return res.sendFile(path.join(__dirname, 'views', 'login.html'));
    }
    // Get the job ID from the URL parameters
    const jobId = req.params.id;

    // Fetch data for the job with the specified ID from the database
    db.query('SELECT * FROM jobs WHERE id = ?', [jobId], (err, results) => {
        if (err) {
            console.error('Error fetching job details from database:', err);
            res.status(500).send('Error fetching job details');
            return;
        }

        // Check if a job with the specified ID was found
        if (results.length === 0) {
            res.status(404).send('Job not found');
            return;
        }
         // Format the date (if it's stored as a string in the database)
         const job = results[0];
         job.date_exp = formatDate(job.date_exp); // Assuming date_exp is the field name for the date

        // Render the job details page with the fetched job data
        res.render('updateJob', { job: results[0] });
    });
});
// Function to format the date as "dd/mm/yyyy"
function formatDate(dateString) {
    // Convert the date string to a Date object
    const date = new Date(dateString);
    // Format the date as "dd/mm/yyyy"
    const formattedDate = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    return formattedDate;
}


// Route to handle updating a job
app.post('/updateJob/:id', (req, res) => {
    // Get the job ID from the URL parameters
    const jobId = req.params.id;

    const { title, numberOfPositions, jobType, experience, jobDescription, jobRequirements } = req.body;
    

    // Prepare SQL query with placeholders
    const sql = "UPDATE jobs SET title = ?, type_contrat = ?, nbr_exprience = ?, nbr_postion = ?, description = ?, requirement = ? WHERE id = ? ";

    // Prepare data for insertion
    const values = [title, jobType, experience, numberOfPositions, jobDescription, jobRequirements, jobId];

    // Update the job in the database
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('Error updating job:', err);
            return res.status(500).send('Error updating job');
        }

        // Check if the job was successfully updated
        if (result.affectedRows === 0) {
            return res.status(404).send('Job not found');
        }

        // Job updated successfully
        res.redirect('/dashboard'); // Redirect to dashboard after successfully adding the job
    });
});

// Route to handle deleting a job
app.get('/deleteJob/:id', (req, res) => {
    // Get the job ID from the URL parameters
    const jobId = req.params.id;

    // Delete the job from the database
    db.query('DELETE FROM jobs WHERE id = ?', [jobId], (err, result) => {
        if (err) {
            console.error('Error deleting job:', err);
            return res.status(500).send('Error deleting job');
        }

        // Check if the job was successfully deleted
        if (result.affectedRows === 0) {
            return res.status(404).send('Job not found');
        }

        // Job deleted successfully
        res.redirect('/dashboard'); // Redirect to dashboard after successfully adding the job
    });
});






// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
