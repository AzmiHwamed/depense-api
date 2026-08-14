CREATE TABLE IF NOT EXISTS interpreter_conversations (
  id varchar(36) NOT NULL,
  userId varchar(36) NOT NULL,
  travelerLanguage varchar(35) NOT NULL,
  localLanguage varchar(35) NOT NULL,
  title varchar(120) NULL,
  createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  INDEX IDX_interpreter_conversations_user (userId),
  CONSTRAINT FK_interpreter_conversations_user
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS interpreter_turns (
  id varchar(36) NOT NULL,
  conversationId varchar(36) NOT NULL,
  speaker enum('traveler', 'local') NOT NULL,
  sourceLanguage varchar(35) NOT NULL,
  targetLanguage varchar(35) NOT NULL,
  sourceText text NOT NULL,
  translatedText text NOT NULL,
  sourceAudioUrl varchar(500) NOT NULL,
  translatedAudioUrl varchar(500) NOT NULL,
  sourceMimeType varchar(100) NOT NULL,
  translatedMimeType varchar(100) NOT NULL DEFAULT 'audio/mpeg',
  createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  INDEX IDX_interpreter_turns_conversation (conversationId),
  CONSTRAINT FK_interpreter_turns_conversation
    FOREIGN KEY (conversationId) REFERENCES interpreter_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB;
