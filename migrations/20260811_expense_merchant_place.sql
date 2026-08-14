ALTER TABLE expenses
  ADD COLUMN googlePlaceId varchar(255) NULL AFTER shop,
  ADD COLUMN merchantAddress text NULL AFTER googlePlaceId,
  ADD COLUMN merchantLatitude decimal(10,7) NULL AFTER merchantAddress,
  ADD COLUMN merchantLongitude decimal(10,7) NULL AFTER merchantLatitude,
  ADD COLUMN googleMapsUri text NULL AFTER merchantLongitude,
  ADD COLUMN merchantMatchConfidence smallint NULL AFTER googleMapsUri;

CREATE INDEX IDX_expenses_google_place_id ON expenses (googlePlaceId);
