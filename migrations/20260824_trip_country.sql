ALTER TABLE trips ADD COLUMN countryId char(36) NULL;
ALTER TABLE trips ADD INDEX IDX_trips_country (countryId);
ALTER TABLE trips ADD CONSTRAINT FK_trips_country FOREIGN KEY (countryId) REFERENCES countries(id);
