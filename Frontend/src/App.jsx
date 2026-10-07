import React, { useState, useEffect } from "react";
import "./App.css";

const API_BASE_URL = "http://localhost:5000";

function App() {
  
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  
  const [search, setSearch] = useState("");
  const [priceFilter, setPriceFilter] = useState("");
  const [page, setPage] = useState(1);

  
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBooking, setShowBooking] = useState(false);

  
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [guestType, setGuestType] = useState("Family");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    location: "",
    price: "",
    rating: "4.5",
    description: "",
    facilities: "Free Wi-Fi, Restaurant, Swimming Pool, Parking"
  });
  const [addImageFile, setAddImageFile] = useState(null);
  const [addImagePreview, setAddImagePreview] = useState(null);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);

  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editHotelId, setEditHotelId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    location: "",
    price: "",
    rating: "4.5",
    description: "",
    facilities: ""
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [existingImage, setExistingImage] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const hotelsPerPage = 2;

  
  const getImageUrl = (img) => {
    if (!img) return "/image1.jpg";
    if (img.startsWith("http://") || img.startsWith("https://")) return img;
    if (img.startsWith("/uploads/")) return `${API_BASE_URL}${img}`;
    return img;
  };

  
  const getFacilitiesArray = (facilities) => {
    if (Array.isArray(facilities)) return facilities;
    if (typeof facilities === "string") {
      try {
        const parsed = JSON.parse(facilities);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return facilities.split(",").map((f) => f.trim()).filter(Boolean);
      }
    }
    return [];
  };

  
  const getRoomsArray = (rooms) => {
    if (Array.isArray(rooms)) return rooms;
    if (typeof rooms === "string") {
      try {
        const parsed = JSON.parse(rooms);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return [];
      }
    }
    return [];
  };

  
  const fetchHotels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hotels`);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      setHotels(data);
    } catch (err) {
      console.error("Error fetching hotels from backend:", err);
      setError("Failed to load hotels from database. Make sure backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  
  const filteredHotels = hotels.filter((hotel) => {
    const searchText = search.toLowerCase();
    const searchMatch =
      hotel.name.toLowerCase().includes(searchText) ||
      hotel.location.toLowerCase().includes(searchText);

    let priceMatch = true;
    const hotelPrice = Number(hotel.price) || 0;
    if (priceFilter === "low") {
      priceMatch = hotelPrice <= 3500;
    }
    if (priceFilter === "medium") {
      priceMatch = hotelPrice > 3500 && hotelPrice <= 4500;
    }
    if (priceFilter === "high") {
      priceMatch = hotelPrice > 4500;
    }

    return searchMatch && priceMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredHotels.length / hotelsPerPage));
  const startIndex = (page - 1) * hotelsPerPage;
  const currentHotels = filteredHotels.slice(startIndex, startIndex + hotelsPerPage);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handlePrice = (value) => {
    setPriceFilter(value);
    setPage(1);
  };

  
  const openDetails = (hotel) => {
    setSelectedHotel(hotel);
    setSelectedRoom(null);
    setShowBooking(false);
  };

  const closeModal = () => {
    setSelectedHotel(null);
    setSelectedRoom(null);
    setShowBooking(false);
  };

  const openBooking = () => {
    if (!selectedRoom) {
      alert("Please select a room first.");
      return;
    }
    setShowBooking(true);
  };

  
  const getOffer = () => {
    if (guestType === "Family") return 20;
    if (guestType === "Couples") return 30;
    if (guestType === "Friends") return 25;
    return 0;
  };

  const offer = getOffer();
  const roomPrice = selectedHotel ? Number(selectedHotel.price) || 0 : 0;
  const discountAmount = (roomPrice * offer) / 100;
  const priceAfterOffer = roomPrice - discountAmount;
  const tax = priceAfterOffer * 0.05;
  const totalAmount = priceAfterOffer + tax;

  
  const confirmBooking = async () => {
    if (!name || !mobile || !checkIn || !checkOut) {
      alert("Please fill all details.");
      return;
    }

    setIsBookingSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_id: selectedHotel?.id,
          hotel_name: selectedHotel?.name,
          room_name: selectedRoom?.name,
          guest_name: name,
          mobile,
          guest_type: guestType,
          check_in: checkIn,
          check_out: checkOut,
          total_amount: totalAmount
        })
      });

      if (!response.ok) {
        throw new Error("Failed to save booking to database.");
      }

      alert(
        `🎉 Booking Confirmed and Saved to PostgreSQL!\n\nName: ${name}\nMobile: ${mobile}\nHotel: ${selectedHotel.name}\nRoom: ${selectedRoom.name}\nGuest Type: ${guestType}\nOffer: ${offer}%\nTotal Amount: ₹${totalAmount.toFixed(0)}`
      );

      // Reset form
      setName("");
      setMobile("");
      setCheckIn("");
      setCheckOut("");
      setShowBooking(false);
      setSelectedHotel(null);
    } catch (err) {
      alert(`Booking error: ${err.message}`);
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  
  const openAddModal = () => {
    setAddForm({
      name: "",
      location: "",
      price: "",
      rating: "4.5",
      description: "",
      facilities: "Free Wi-Fi, Restaurant, Swimming Pool, Parking"
    });
    setAddImageFile(null);
    setAddImagePreview(null);
    setShowAddModal(true);
  };

  const handleAddImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAddImageFile(file);
      setAddImagePreview(URL.createObjectURL(file));
    }
  };

  const submitAddHotel = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.location || !addForm.price) {
      alert("Name, location, and price are required!");
      return;
    }

    setIsAddSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", addForm.name);
      formData.append("location", addForm.location);
      formData.append("price", addForm.price);
      formData.append("rating", addForm.rating);
      formData.append("description", addForm.description);
      formData.append("facilities", addForm.facilities);

      if (addImageFile) {
        formData.append("image", addImageFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/hotels`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create hotel.");
      }

      await fetchHotels();
      setShowAddModal(false);
      alert("Hotel added and image stored to backend successfully!");
    } catch (err) {
      alert(`Failed to add hotel: ${err.message}`);
    } finally {
      setIsAddSubmitting(false);
    }
  };

  
  const openEditModal = (hotel) => {
    setEditHotelId(hotel.id);
    const facilitiesText = getFacilitiesArray(hotel.facilities).join(", ");
    setEditForm({
      name: hotel.name,
      location: hotel.location,
      price: hotel.price,
      rating: hotel.rating,
      description: hotel.description || "",
      facilities: facilitiesText
    });
    setExistingImage(hotel.image || "");
    setEditImageFile(null);
    setEditImagePreview(null);
    setShowEditModal(true);
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const submitEditHotel = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.location || !editForm.price) {
      alert("Name, location, and price are required!");
      return;
    }

    setIsEditSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", editForm.name);
      formData.append("location", editForm.location);
      formData.append("price", editForm.price);
      formData.append("rating", editForm.rating);
      formData.append("description", editForm.description);
      formData.append("facilities", editForm.facilities);

      if (editImageFile) {
        formData.append("image", editImageFile);
      } else {
        formData.append("image", existingImage);
      }

      const response = await fetch(`${API_BASE_URL}/api/hotels/${editHotelId}`, {
        method: "PUT",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update hotel.");
      }

      await fetchHotels();
      setShowEditModal(false);
      alert("Hotel updated successfully!");
    } catch (err) {
      alert(`Failed to update hotel: ${err.message}`);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  
  const handleDeleteHotel = async (hotelId, hotelName) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${hotelName}" from the database?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/hotels/${hotelId}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to delete hotel.");
      }

      await fetchHotels();
      alert(`"${hotelName}" was deleted successfully from PostgreSQL.`);
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="logo-area">
          <div className="logo-circle">PH</div>
          <h1>PALACE HOTEL</h1>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#hotels">Hotels</a>
          <a href="#about">About</a>
          <a href="#reviews">Reviews</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      
      <section className="hero" id="home">
        <p className="welcome">WELCOME TO</p>
        <h2>
          Find Your Perfect <span>Stay</span>
        </h2>
        <p>Discover beautiful hotels and resorts across South India.</p>
      </section>

      
      <main className="main-content" id="hotels">
        <div className="section-heading">
          <p>EXPLORE OUR HOTELS</p>
          <h2>Luxury Stays & Beautiful Destinations</h2>
          <span>Choose your favourite destination and enjoy a comfortable stay.</span>
        </div>

        
        <div className="filters">
          <input
            type="text"
            placeholder="🔍 Search hotel or location..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />

          <select value={priceFilter} onChange={(e) => handlePrice(e.target.value)}>
            <option value="">Price Filter</option>
            <option value="low">Below ₹3500</option>
            <option value="medium">₹3500 - ₹4500</option>
            <option value="high">Above ₹4500</option>
          </select>

          <button className="add-hotel" onClick={openAddModal}>
            + Add Hotel
          </button>
        </div>

      
        {loading && (
          <div className="loading-container">
            <p>⏳ Loading hotels from PostgreSQL database...</p>
          </div>
        )}

        {error && (
          <div className="empty-state">
            <h3 style={{ color: "#c5221f" }}>⚠️ Connection Notice</h3>
            <p>{error}</p>
            <button className="gold-button" style={{ marginTop: "15px" }} onClick={fetchHotels}>
              🔄 Retry Connection
            </button>
          </div>
        )}

        {/* Hotel Cards List */}
        {!loading && !error && (
          <div className="hotel-list">
            {currentHotels.map((hotel) => {
              const facilities = getFacilitiesArray(hotel.facilities);

              return (
                <div className="hotel-card" key={hotel.id}>
                  <div className="hotel-image-box">
                    <img src={getImageUrl(hotel.image)} alt={hotel.name} />
                    <div className="rating">⭐ {hotel.rating}</div>
                  </div>

                  <div className="hotel-content">
                    <p className="location">📍 {hotel.location}</p>
                    <h2>{hotel.name}</h2>
                    <p className="description">{hotel.description}</p>

                    <h3>Facilities</h3>
                    <div className="facilities">
                      {facilities.map((facility, index) => (
                        <span key={index}>{facility}</span>
                      ))}
                    </div>

                    <div className="price-row">
                      <div>
                        <small>Starting from</small>
                        <strong>₹{hotel.price}</strong>
                        <small>/ night</small>
                      </div>
                    </div>

                    <div className="card-buttons">
                      <button onClick={() => openDetails(hotel)}>View Details</button>
                      <button onClick={() => openDetails(hotel)}>Book Now</button>
                      <button onClick={() => openEditModal(hotel)}>Edit</button>
                      <button
                        className="delete-button"
                        onClick={() => handleDeleteHotel(hotel.id, hotel.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      
        {!loading && !error && filteredHotels.length === 0 && (
          <div className="no-results">
            <h2>No Hotels Found</h2>
            <p>Try another hotel name, location, or add a new hotel!</p>
          </div>
        )}

        
        {!loading && !error && totalPages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              ← Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              Next →
            </button>
          </div>
        )}
      </main>

      
      {selectedHotel && !showBooking && (
        <div className="modal-overlay">
          <div className="details-modal">
            <button className="close-button" onClick={closeModal}>
              ×
            </button>

            <p className="modal-location">📍 {selectedHotel.location}</p>
            <h2>{selectedHotel.name}</h2>

            <div className="room-list">
              {getRoomsArray(selectedHotel.rooms).map((room, index) => (
                <div
                  className={
                    selectedRoom?.name === room.name ? "room-card selected" : "room-card"
                  }
                  key={index}
                  onClick={() => setSelectedRoom(room)}
                >
                  <img src={getImageUrl(room.image)} alt={room.name} />
                  <h3>{room.name}</h3>
                  <p>Comfortable interior with modern furniture and premium facilities.</p>
                  {selectedRoom?.name === room.name && (
                    <div className="selected-text">✓ Selected</div>
                  )}
                </div>
              ))}
            </div>

            {selectedRoom && (
              <div className="selected-room">
                Selected Room:
                <strong> {selectedRoom.name}</strong>
              </div>
            )}

            <div className="modal-bottom">
              <div>
                ⭐ {selectedHotel.rating}
                <strong>₹{selectedHotel.price} / night</strong>
              </div>

              <button className="gold-button" onClick={openBooking}>
                Book This Hotel
              </button>
            </div>
          </div>
        </div>
      )}

    
      {showBooking && selectedHotel && selectedRoom && (
        <div className="modal-overlay">
          <div className="booking-modal">
            <button className="close-button" onClick={() => setShowBooking(false)}>
              ×
            </button>

            <h2>Booking Details</h2>
            <p className="booking-hotel">{selectedHotel.name}</p>
            <p>
              Room:
              <strong> {selectedRoom.name}</strong>
            </p>

            <label>Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label>Mobile Number</label>
            <input
              type="text"
              placeholder="Enter mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />

            <label>Guest Type</label>
            <select value={guestType} onChange={(e) => setGuestType(e.target.value)}>
              <option value="Family">Family</option>
              <option value="Couples">Couples</option>
              <option value="Friends">Friends</option>
            </select>

            <div className="offer-box">🎉 {guestType} offer: {offer}% discount</div>

            <div className="date-row">
              <div>
                <label>Check In</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>

              <div>
                <label>Check Out</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>

            <div className="bill-box">
              <div>
                <span>Room Price</span>
                <strong>₹{roomPrice}</strong>
              </div>

              <div>
                <span>{offer}% Offer</span>
                <strong className="discount">- ₹{discountAmount.toFixed(0)}</strong>
              </div>

              <div>
                <span>Price After Offer</span>
                <strong>₹{priceAfterOffer.toFixed(0)}</strong>
              </div>

              <div>
                <span>Tax (5%)</span>
                <strong>₹{tax.toFixed(0)}</strong>
              </div>

              <div className="total-row">
                <span>Total Amount</span>
                <strong>₹{totalAmount.toFixed(0)}</strong>
              </div>
            </div>

            <button
              className="confirm-button"
              disabled={isBookingSubmitting}
              onClick={confirmBooking}
            >
              {isBookingSubmitting ? "Saving to Database..." : "Confirm Booking"}
            </button>
          </div>
        </div>
      )}

      
      {showAddModal && (
        <div className="modal-overlay">
          <div className="hotel-form-modal">
            <button className="close-button" onClick={() => setShowAddModal(false)}>
              ×
            </button>

            <h2>Add New Hotel</h2>

            <form onSubmit={submitAddHotel}>
              <div className="form-grid-2">
                <div>
                  <label>Hotel Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ooty Paradise Hotel"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label>Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ooty, Tamil Nadu"
                    value={addForm.location}
                    onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div>
                  <label>Starting Price (₹ / night) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 4500"
                    value={addForm.price}
                    onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
                  />
                </div>

                <div>
                  <label>Rating (1.0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    placeholder="e.g. 4.8"
                    value={addForm.rating}
                    onChange={(e) => setAddForm({ ...addForm, rating: e.target.value })}
                  />
                </div>
              </div>

              <label>Description</label>
              <textarea
                placeholder="Describe the hotel amenities and scenic views..."
                value={addForm.description}
                onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              />

              <label>Facilities (Comma separated)</label>
              <input
                type="text"
                placeholder="e.g. Free Wi-Fi, Swimming Pool, Restaurant, Parking"
                value={addForm.facilities}
                onChange={(e) => setAddForm({ ...addForm, facilities: e.target.value })}
              />

              <label>Upload Hotel Image (Multer)</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddImageChange}
                />
                <p style={{ marginTop: "6px", fontSize: "14px", color: "#666" }}>
                  Selected image is uploaded via Multer to the backend <code>uploads/</code> folder and stored in PostgreSQL.
                </p>
              </div>

              {addImagePreview && (
                <div className="image-preview-area">
                  <span>Preview:</span>
                  <img src={addImagePreview} alt="Upload preview" />
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  disabled={isAddSubmitting}
                >
                  {isAddSubmitting ? "Uploading & Saving..." : "Save Hotel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {showEditModal && (
        <div className="modal-overlay">
          <div className="hotel-form-modal">
            <button className="close-button" onClick={() => setShowEditModal(false)}>
              ×
            </button>

            <h2>Edit Hotel Details</h2>

            <form onSubmit={submitEditHotel}>
              <div className="form-grid-2">
                <div>
                  <label>Hotel Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label>Location *</label>
                  <input
                    type="text"
                    required
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div>
                  <label>Starting Price (₹ / night) *</label>
                  <input
                    type="number"
                    required
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  />
                </div>

                <div>
                  <label>Rating (1.0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={editForm.rating}
                    onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                  />
                </div>
              </div>

              <label>Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />

              <label>Facilities (Comma separated)</label>
              <input
                type="text"
                value={editForm.facilities}
                onChange={(e) => setEditForm({ ...editForm, facilities: e.target.value })}
              />

              <label>Replace Hotel Image (Optional)</label>
              <div className="file-input-wrapper">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageChange}
                />
              </div>

              <div className="image-preview-area">
                <span>Current Image:</span>
                <img
                  src={editImagePreview || getImageUrl(existingImage)}
                  alt="Hotel display"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-gold"
                  disabled={isEditSubmitting}
                >
                  {isEditSubmitting ? "Updating..." : "Update Hotel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;