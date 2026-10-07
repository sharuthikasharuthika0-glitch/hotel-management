require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { pool, query, initDB } = require("./db");

const app = express();


const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `hotel-${uniqueSuffix}${ext}`);
  }
});


const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|gif|svg/;
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;

  if (allowedExtensions.test(ext) || allowedExtensions.test(mime)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, webp, gif, svg) are allowed!"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/uploads", express.static(uploadsDir));


initDB();




app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Hotel Management Backend Server is Running",
    database: "PostgreSQL",
    uploads: "/uploads"
  });
});

app.get("/api/health", async (req, res) => {
  try {
    const dbRes = await query("SELECT NOW() as current_time, current_database() as database_name;");
    res.json({
      status: "connected",
      database: dbRes.rows[0].database_name,
      server_time: dbRes.rows[0].current_time
    });
  } catch (err) {
    res.status(500).json({
      status: "disconnected",
      message: "Database connection failed",
      error: err.message
    });
  }
});


app.post("/api/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }
    const relativePath = `/uploads/${req.file.filename}`;
    res.status(201).json({
      message: "Image uploaded successfully!",
      imageUrl: relativePath,
      filename: req.file.filename
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload image", details: err.message });
  }
});


app.get("/api/hotels", async (req, res) => {
  try {
    const result = await query("SELECT * FROM hotels ORDER BY id ASC;");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching hotels from PostgreSQL:", err.message);
    res.status(500).json({
      error: "Failed to fetch hotels from database",
      details: err.message
    });
  }
});


app.get("/api/hotels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("SELECT * FROM hotels WHERE id = $1;", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Hotel not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching hotel by id:", err.message);
    res.status(500).json({ error: "Failed to fetch hotel", details: err.message });
  }
});


app.post("/api/hotels", upload.single("image"), async (req, res) => {
  try {
    const { name, location, rating, price, description, facilities, rooms, image } = req.body;

    if (!name || !location || !price) {
      return res.status(400).json({ error: "Name, location, and price are required fields." });
    }

    
    let imagePath = "/image1.jpg";
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    } else if (image && image.trim() !== "") {
      imagePath = image.trim();
    }

    
    let parsedFacilities = ["Free Wi-Fi", "Restaurant", "Parking"];
    if (facilities) {
      if (Array.isArray(facilities)) {
        parsedFacilities = facilities;
      } else if (typeof facilities === "string") {
        try {
          const parsed = JSON.parse(facilities);
          parsedFacilities = Array.isArray(parsed) ? parsed : [facilities];
        } catch {
          parsedFacilities = facilities.split(",").map((f) => f.trim()).filter(Boolean);
        }
      }
    }

    
    const defaultRooms = [
      { name: "Luxury Room", image: imagePath },
      { name: "Deluxe Room", image: "/room2.jpg" },
      { name: "Premium Room", image: "/room3.jpg" }
    ];

    let parsedRooms = defaultRooms;
    if (rooms) {
      if (Array.isArray(rooms) && rooms.length > 0) {
        parsedRooms = rooms;
      } else if (typeof rooms === "string") {
        try {
          const parsed = JSON.parse(rooms);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedRooms = parsed;
          }
        } catch {
          parsedRooms = defaultRooms;
        }
      }
    }

    const result = await query(
      `INSERT INTO hotels (name, location, rating, price, image, description, facilities, rooms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        name,
        location,
        rating ? parseFloat(rating) : 4.5,
        parseInt(price, 10),
        imagePath,
        description || "",
        JSON.stringify(parsedFacilities),
        JSON.stringify(parsedRooms)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating hotel:", err.message);
    res.status(500).json({ error: "Failed to create hotel", details: err.message });
  }
});


app.put("/api/hotels/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, rating, price, description, facilities, rooms, image } = req.body;

    const checkHotel = await query("SELECT * FROM hotels WHERE id = $1;", [id]);
    if (checkHotel.rows.length === 0) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    const current = checkHotel.rows[0];

    
    let updatedImage = current.image;
    if (req.file) {
      updatedImage = `/uploads/${req.file.filename}`;
      
      if (current.image && current.image.startsWith("/uploads/")) {
        const oldFile = path.join(__dirname, current.image);
        if (fs.existsSync(oldFile)) {
          fs.unlink(oldFile, () => {});
        }
      }
    } else if (image !== undefined && image.trim() !== "") {
      updatedImage = image.trim();
    }

    const updatedName = name !== undefined ? name : current.name;
    const updatedLocation = location !== undefined ? location : current.location;
    const updatedRating = rating !== undefined ? parseFloat(rating) : current.rating;
    const updatedPrice = price !== undefined ? parseInt(price, 10) : current.price;
    const updatedDescription = description !== undefined ? description : current.description;

    let updatedFacilities = current.facilities;
    if (facilities !== undefined) {
      if (Array.isArray(facilities)) {
        updatedFacilities = facilities;
      } else if (typeof facilities === "string") {
        try {
          const parsed = JSON.parse(facilities);
          updatedFacilities = Array.isArray(parsed) ? parsed : [facilities];
        } catch {
          updatedFacilities = facilities.split(",").map((f) => f.trim()).filter(Boolean);
        }
      }
    }

    let updatedRooms = current.rooms;
    if (rooms !== undefined) {
      if (Array.isArray(rooms)) {
        updatedRooms = rooms;
      } else if (typeof rooms === "string") {
        try {
          const parsed = JSON.parse(rooms);
          if (Array.isArray(parsed)) {
            updatedRooms = parsed;
          }
        } catch {
          
        }
      }
    }

    const result = await query(
      `UPDATE hotels
       SET name = $1,
           location = $2,
           rating = $3,
           price = $4,
           image = $5,
           description = $6,
           facilities = $7,
           rooms = $8
       WHERE id = $9
       RETURNING *;`,
      [
        updatedName,
        updatedLocation,
        updatedRating,
        updatedPrice,
        updatedImage,
        updatedDescription,
        JSON.stringify(updatedFacilities || []),
        JSON.stringify(updatedRooms || []),
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating hotel:", err.message);
    res.status(500).json({ error: "Failed to update hotel", details: err.message });
  }
});


app.delete("/api/hotels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query("DELETE FROM hotels WHERE id = $1 RETURNING *;", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    const deleted = result.rows[0];

    
    if (deleted.image && deleted.image.startsWith("/uploads/")) {
      const filePath = path.join(__dirname, deleted.image);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, () => {});
      }
    }

    res.json({ message: "Hotel deleted successfully", deleted });
  } catch (err) {
    console.error("Error deleting hotel:", err.message);
    res.status(500).json({ error: "Failed to delete hotel", details: err.message });
  }
});


app.post("/api/bookings", async (req, res) => {
  try {
    const {
      hotel_id,
      hotel_name,
      room_name,
      guest_name,
      mobile,
      guest_type,
      check_in,
      check_out,
      total_amount
    } = req.body;

    if (!room_name || !guest_name || !mobile || !check_in || !check_out) {
      return res.status(400).json({ error: "Please fill all required booking details." });
    }

    const result = await query(
      `INSERT INTO bookings (hotel_id, hotel_name, room_name, guest_name, mobile, guest_type, check_in, check_out, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *;`,
      [
        hotel_id || null,
        hotel_name || null,
        room_name,
        guest_name,
        mobile,
        guest_type || "Family",
        check_in,
        check_out,
        total_amount || 0
      ]
    );

    res.status(201).json({
      message: "Booking confirmed and saved to PostgreSQL successfully!",
      booking: result.rows[0]
    });
  } catch (err) {
    console.error("Error saving booking into PostgreSQL:", err.message);
    res.status(500).json({ error: "Failed to save booking", details: err.message });
  }
});


app.get("/api/bookings", async (req, res) => {
  try {
    const result = await query("SELECT * FROM bookings ORDER BY created_at DESC;");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching bookings:", err.message);
    res.status(500).json({ error: "Failed to fetch bookings", details: err.message });
  }
});


app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
