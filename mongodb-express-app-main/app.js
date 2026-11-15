import express from "express";
import { MongoClient, ObjectId } from "mongodb";

const app = express();

// Render port configuration
const port = process.env.PORT || 7000;

// MongoDB configuration
const mongoUrl = process.env.MONGO_URL;
const databaseName = process.env.DB_NAME || "library_db";

if (!mongoUrl) {
    throw new Error("MONGO_URL is missing in environment variables");
}

const client = new MongoClient(mongoUrl, {
    serverSelectionTimeoutMS: 15000
});

let db;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to validate MongoDB ObjectId
function isValidId(id) {
    return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

// CREATE BOOK
// POST /api/v1/books

app.post("/api/v1/books", async (req, res, next) => {
    try {
        const { title, author, category, price } = req.body;

        if (
            !title ||
            !author ||
            !category ||
            price === undefined ||
            price === null ||
            price === ""
        ) {
            return res.status(400).json({
                message: "All book fields are required"
            });
        }

        const book = {
            title,
            author,
            category,
            price
        };

        const result = await db.collection("books").insertOne(book);

        const newBook = {
            _id: result.insertedId,
            ...book
        };

        res.status(201).json({
            message: "Book created successfully",
            data: newBook
        });

    } catch (err) {
        next(err);
    }
});


// GET ALL BOOKS OR FILTER BY CATEGORY
// GET /api/v1/books
// GET /api/v1/books?category=Fiction

app.get("/api/v1/books", async (req, res, next) => {
    try {
        const category = req.query.category;

        const query = category ? { category } : {};

        const books = await db.collection("books")
            .find(query)
            .toArray();

        res.status(200).json({
            message: "Books fetched successfully",
            data: books
        });

    } catch (err) {
        next(err);
    }
});


// GET SINGLE BOOK BY ID
// GET /api/v1/books/:id

app.get("/api/v1/books/:id", async (req, res, next) => {
    try {
        const bookId = req.params.id;

        if (!isValidId(bookId)) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        const book = await db.collection("books").findOne({
            _id: new ObjectId(bookId)
        });

        if (!book) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.status(200).json({
            message: "Book fetched successfully",
            data: book
        });

    } catch (err) {
        next(err);
    }
});


// UPDATE BOOK BY ID
// PUT /api/v1/books/:id

app.put("/api/v1/books/:id", async (req, res, next) => {
    try {
        const bookId = req.params.id;

        if (!isValidId(bookId)) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        const { title, author, category, price } = req.body;

        if (
            !title ||
            !author ||
            !category ||
            price === undefined ||
            price === null ||
            price === ""
        ) {
            return res.status(400).json({
                message: "All book fields are required"
            });
        }

        const updatedBook = {
            title,
            author,
            category,
            price
        };

        const result = await db.collection("books").updateOne(
            { _id: new ObjectId(bookId) },
            { $set: updatedBook }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.status(200).json({
            message: "Book updated successfully",
            data: {
                _id: new ObjectId(bookId),
                ...updatedBook
            }
        });

    } catch (err) {
        next(err);
    }
});


// DELETE BOOK BY ID
// DELETE /api/v1/books/:id

app.delete("/api/v1/books/:id", async (req, res, next) => {
    try {
        const bookId = req.params.id;

        if (!isValidId(bookId)) {
            return res.status(400).json({
                message: "Invalid book ID"
            });
        }

        const result = await db.collection("books").deleteOne({
            _id: new ObjectId(bookId)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                message: "Book not found"
            });
        }

        res.status(200).json({
            message: "Book deleted successfully"
        });

    } catch (err) {
        next(err);
    }
});


// HOME ROUTE

app.get("/", (req, res) => {
    res.status(200).send("Library Management API is running");
});


// 404 NOT FOUND MIDDLEWARE

app.use((req, res) => {
    res.status(404).json({
        message: "Not Found"
    });
});


// ERROR HANDLING MIDDLEWARE

app.use((err, req, res, next) => {
    console.error("Error:", err);

    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error"
    });
});


// CONNECT TO MONGODB AND START SERVER

async function startServer() {
    try {
        await client.connect();

        db = client.db(databaseName);

        console.log("Connected to MongoDB");

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });

    } catch (err) {
        console.error("MongoDB connection failed:", err);

        await client.close().catch(() => {});

        process.exit(1);
    }
}

startServer();
