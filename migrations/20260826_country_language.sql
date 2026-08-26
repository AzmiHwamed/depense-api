ALTER TABLE `countries`
  ADD COLUMN `languageId` varchar(36) NULL AFTER `currencyId`,
  ADD INDEX `IDX_countries_languageId` (`languageId`),
  ADD CONSTRAINT `FK_countries_languageId`
    FOREIGN KEY (`languageId`) REFERENCES `languages` (`id`)
    ON DELETE SET NULL ON UPDATE NO ACTION;
