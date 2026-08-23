-- Associate receipts with their authenticated owner.
-- Existing legacy rows remain NULL and are intentionally inaccessible through
-- the user-scoped API until an administrator assigns or removes them.
ALTER TABLE `receipts`
  ADD COLUMN `userId` varchar(36) NULL;

CREATE INDEX `IDX_receipts_userId` ON `receipts` (`userId`);

ALTER TABLE `receipts`
  ADD CONSTRAINT `FK_receipts_user`
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`)
  ON DELETE CASCADE ON UPDATE NO ACTION;
