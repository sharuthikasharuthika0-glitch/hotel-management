const { Pool } = require("pg");
require("dotenv").config();


const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      user: process.env.PGUSER || "postgres",
      host: process.env.PGHOST || "localhost",
      database: process.env.PGDATABASE || "postgres",
      password: process.env.PGPASSWORD || "",
      port: parseInt(process.env.PGPORT || "5432", 10)
    });


pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err.message);
});


const query = (text, params) => pool.query(text, params);


const initDB = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log("Connected to PostgreSQL database successfully!");

    
    await client.query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        rating NUMERIC(3, 1) DEFAULT 4.5,
        price INTEGER NOT NULL,
        image TEXT,
        description TEXT,
        facilities JSONB DEFAULT '[]',
        rooms JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    
    await client.query(`
      ALTER TABLE hotels ADD COLUMN IF NOT EXISTS image TEXT;
      ALTER TABLE hotels ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE hotels ADD COLUMN IF NOT EXISTS facilities JSONB DEFAULT '[]';
      ALTER TABLE hotels ADD COLUMN IF NOT EXISTS rooms JSONB DEFAULT '[]';
      ALTER TABLE hotels ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        hotel_id INTEGER REFERENCES hotels(id) ON DELETE SET NULL,
        hotel_name VARCHAR(255),
        room_name VARCHAR(255) NOT NULL,
        guest_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        guest_type VARCHAR(50) NOT NULL,
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    
    const res = await client.query("SELECT COUNT(*) FROM hotels;");
    const count = parseInt(res.rows[0].count, 10);

    if (count === 0) {
      console.log("Seeding demo hotel data into PostgreSQL database...");
      const seedHotels = [
        {
          name: "Ooty Grand Hotel",
          location: "Ooty, Tamil Nadu",
          rating: 4.8,
          price: 5000,
          image: "/image1.jpg",
          description:
            "Ooty Grand Hotel offers a luxurious and comfortable stay with beautiful surroundings, modern facilities and excellent hospitality.",
          facilities: ["Free Wi-Fi", "Restaurant", "Swimming Pool", "Free Parking"],
          rooms: [
            { name: "Luxury Room", image: "/room1.jpg" },
            { name: "Deluxe Room", image: "/room2.jpg" },
            { name: "Premium Room", image: "/room3.jpg" }
          ]
        },
        {
          name: "Kodaikanal Royal Hotel",
          location: "Kodaikanal, Tamil Nadu",
          rating: 4.7,
          price: 4200,
          image: "/image2.jpg",
          description:
            "A peaceful hotel with beautiful rooms, scenic views and excellent hospitality near Kodaikanal Lake.",
          facilities: ["Free Wi-Fi", "Lake View", "Restaurant", "Room Service"],
          rooms: [
            { name: "Luxury Room", image: "/room2.jpg" },
            { name: "Deluxe Room", image: "/room3.jpg" },
            { name: "Premium Room", image: "/room4.jpg" }
          ]
        },
        {
          name: "Yercaud Lake View Hotel",
          location: "Yercaud, Tamil Nadu",
          rating: 4.5,
          price: 3200,
          image: "/image3.jpg",
          description:
            "A comfortable hotel with beautiful lake views, modern rooms and a peaceful atmosphere.",
          facilities: ["Free Wi-Fi", "Lake View", "Restaurant", "Parking"],
          rooms: [
            { name: "Luxury Room", image: "/room3.jpg" },
            { name: "Deluxe Room", image: "/room4.jpg" },
            { name: "Premium Room", image: "/room5.jpg" }
          ]
        },
        {
          name: "Valparai Nature Resort",
          location: "Valparai, Tamil Nadu",
          rating: 4.6,
          price: 3600,
          image: "/image4.jpg",
          description:
            "A beautiful nature resort offering a relaxing stay with modern rooms and scenic surroundings.",
          facilities: ["Free Wi-Fi", "Restaurant", "Garden", "Room Service"],
          rooms: [
            { name: "Luxury Room", image: "/room4.jpg" },
            { name: "Deluxe Room", image: "/room5.jpg" },
            { name: "Premium Room", image: "/room6.jpg" }
          ]
        },
        {
          name: "Munnar Hills Resort",
          location: "Munnar, Kerala",
          rating: 4.7,
          price: 4500,
          image: "/image5.jpg",
          description:
            "A scenic hill resort with comfortable rooms, beautiful mountain views and premium facilities.",
          facilities: ["Free Wi-Fi", "Mountain View", "Restaurant", "Parking"],
          rooms: [
            { name: "Luxury Room", image: "/room5.jpg" },
            { name: "Deluxe Room", image: "/room6.jpg" },
            { name: "Premium Room", image: "/room1.jpg" }
          ]
        },
        {
          name: "Coorg Valley Resort",
          location: "Coorg, Karnataka",
          rating: 4.6,
          price: 3900,
          image: "/image6.jpg",
          description:
            "A peaceful valley resort surrounded by greenery with comfortable rooms and excellent service.",
          facilities: ["Free Wi-Fi", "Garden", "Restaurant", "Parking"],
          rooms: [
            { name: "Luxury Room", image: "/room6.jpg" },
            { name: "Deluxe Room", image: "/room1.jpg" },
            { name: "Premium Room", image: "/room2.jpg" }
          ]
        }
      ];

      for (const h of seedHotels) {
        await client.query(
          `INSERT INTO hotels (name, location, rating, price, image, description, facilities, rooms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`,
          [
            h.name,
            h.location,
            h.rating,
            h.price,
            h.image,
            h.description,
            JSON.stringify(h.facilities),
            JSON.stringify(h.rooms)
          ]
        );
      }
      console.log("Demo hotel data successfully seeded into PostgreSQL!");
    } else {
      console.log(`Hotels table already contains ${count} hotels.`);
    }
  } catch (err) {
    console.error("PostgreSQL connection notice:", err.message);
    if (err.message.includes("password authentication failed")) {
      console.error(
        "--> Action Required: Please verify PGPASSWORD in backend/.env"
      );
    }
  } finally {
    if (client) {
      client.release();
    }
  }
};

module.exports = {
  pool,
  query,
  initDB
};
