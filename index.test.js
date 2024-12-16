// Test for Express API
const request = require("supertest");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

let app;
let db;

beforeAll(() => {
  // Init test process
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Mock database 
  db = new sqlite3.Database(":memory:", (err) => {
    if (err) {
      console.error("Could not connect to in-memory database.", err);
    }
  });

  // Create a test table
  db.serialize(() => {
    db.run(
      `CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price REAL)`
    );
  });

  // Routes from a your code
  app.post("/products", (req, res) => {
    const { name, price } = req.body;
    if (!name || price === undefined) {
      res.status(400).json({ error: "Invalid data format" });
      return;
    }

    const sql = `INSERT INTO products (name, price) VALUES (?, ?)`;
    db.run(sql, [name, price], function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({
        message: "Product added successfully.",
        productId: this.lastID,
      });
    });
  });

  app.get("/products", (req, res) => {
    const sql = `SELECT * FROM products`;
    db.all(sql, [], (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    });
  });
});

afterAll(() => {
  db.close();
});

describe("Products API", () => {
  test("POST /products should add a new product", async () => {
    const newProduct = { name: "Test Product", price: 123.45 };

    const response = await request(app)
      .post("/products")
      .send(newProduct)
      .set("Accept", "application/json");

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("message", "Product added successfully.");
    expect(response.body).toHaveProperty("productId");
  });

  test("POST /products should return 400 for invalid data", async () => {
    const invalidProduct = { name: "" };

    const response = await request(app)
      .post("/products")
      .send(invalidProduct)
      .set("Accept", "application/json");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Invalid data format");
  });

  test("GET /products should return all products", async () => {
    // Add data in to table for a test
    db.run("INSERT INTO products (name, price) VALUES (?, ?)", ["Product 1", 50.0]);
    db.run("INSERT INTO products (name, price) VALUES (?, ?)", ["Product 2", 75.0]);

    const response = await request(app).get("/products");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });
});
