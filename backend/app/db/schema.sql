-- PostgreSQL schema with DROP IF EXISTS and indexes

-- Drop tables in reverse dependency order to avoid foreign key constraint errors
DROP TABLE IF EXISTS ai_metadata CASCADE;
DROP TABLE IF EXISTS session_papers CASCADE;
DROP TABLE IF EXISTS paper_tags CASCADE;
DROP TABLE IF EXISTS papers CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS group_participants CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS ai_messages CASCADE;
DROP TABLE IF EXISTS ai_analyses CASCADE;

CREATE TABLE users (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    availability VARCHAR(50) DEFAULT 'available',
    CONSTRAINT availability_constraint CHECK (availability IN ('available', 'busy', 'offline'))
);

CREATE TABLE groups (
    group_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_by INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_groups_created_by ON groups(created_by);

CREATE TABLE group_participants (
    group_participant_id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id),
    constraint role_constraint CHECK (role IN ('admin', 'member', 'mentor'))
);
CREATE INDEX idx_group_participants_group_id ON group_participants(group_id);
CREATE INDEX idx_group_participants_user_id ON group_participants(user_id);

CREATE TABLE sessions (
    session_id SERIAL PRIMARY KEY,
    group_id INT NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
    created_by INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    topic TEXT,
    status VARCHAR(50),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    CONSTRAINT status_constraint CHECK (status IN ('offline', 'active', 'completed'))
);

CREATE INDEX idx_sessions_group_id ON sessions(group_id);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);

CREATE TABLE session_participants (
    session_id INT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id)
);
CREATE INDEX idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX idx_session_participants_user_id ON session_participants(user_id);

CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES group_participants(group_participant_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);



CREATE TABLE papers (
    paper_id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    authors TEXT,
    doi TEXT UNIQUE,
    published_at TIMESTAMP,
    source_url TEXT

);

CREATE TABLE paper_tags (
    paper_id INT NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (paper_id, tag)
);
CREATE INDEX idx_paper_tags_paper_id ON paper_tags(paper_id);

CREATE TABLE session_papers (
    session_id INT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    paper_id INT NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, paper_id)
);
CREATE INDEX idx_session_papers_session_id ON session_papers(session_id);
CREATE INDEX idx_session_papers_paper_id ON session_papers(paper_id);

CREATE TABLE ai_metadata (
    page_no int,
    message_id INT NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
    paper_id INT NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ai_metadata_message_id ON ai_metadata(message_id);
CREATE INDEX idx_ai_metadata_paper_id ON ai_metadata(paper_id);

CREATE TABLE feedback (
    session_id INT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
    given_by INT NOT NULL REFERENCES group_participants(group_participant_id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_feedback_session_id ON feedback(session_id);
CREATE INDEX idx_feedback_given_by ON feedback(given_by);

-- AI users
INSERT INTO users (email, first_name, last_name) VALUES
('ai@assistant.com', 'ai', 'user');

