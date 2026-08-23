CREATE TABLE IF NOT EXISTS trips (
  id char(36) NOT NULL,
  name varchar(150) NOT NULL,
  destination varchar(200) NOT NULL,
  country varchar(100) NULL,
  notes text NULL,
  travelers int NOT NULL DEFAULT 1,
  startDate date NOT NULL,
  endDate date NOT NULL,
  totalAmount decimal(12,2) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'active',
  interests json NULL,
  categoryLimits json NULL,
  reminders json NULL,
  monuments json NULL,
  itinerary json NULL,
  budgetGuidance json NULL,
  aiSummary text NULL,
  currencyId char(36) NOT NULL,
  userId char(36) NOT NULL,
  createdAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  INDEX IDX_trips_user_dates (userId, startDate, endDate),
  CONSTRAINT FK_trips_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT FK_trips_currency FOREIGN KEY (currencyId) REFERENCES currencies(id)
);

ALTER TABLE expenses ADD COLUMN tripId char(36) NULL;
ALTER TABLE expenses ADD INDEX IDX_expenses_trip (tripId);
ALTER TABLE expenses ADD CONSTRAINT FK_expenses_trip FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL;
