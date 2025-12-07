-- PostgreSQL/Supabase Schema für PfotenCard
-- Dieses Schema wird automatisch von SQLAlchemy erstellt, aber hier als Referenz

-- WICHTIG: In Supabase wird die Authentifizierung über Supabase Auth verwaltet
-- Die Passwörter in dieser Tabelle werden NICHT verwendet, wenn Supabase Auth aktiv ist

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    level_id INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    balance FLOAT DEFAULT 0,
    customer_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    phone VARCHAR(50),
    is_vip BOOLEAN NOT NULL DEFAULT FALSE,
    is_expert BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS dogs (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    breed VARCHAR(255),
    birth_date DATE,
    chip VARCHAR(50),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    amount FLOAT NOT NULL,
    balance_after FLOAT NOT NULL,
    booked_by_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booked_by_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    requirement_id VARCHAR(255) NOT NULL,
    date_achieved TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_id INTEGER,
    is_consumed BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_path VARCHAR(512) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Beispieldaten (Passwort für alle: 'passwort')
-- HINWEIS: Wenn Sie Supabase Auth verwenden, erstellen Sie Benutzer über die Supabase UI
INSERT INTO users (name, email, hashed_password, role, is_active, balance, level_id, is_vip, is_expert) VALUES
('Admin Account', 'admin@pfotencard.de', '$2b$12$ZJS4gBANdVT9x.bGQ2gmAOV15eRTKLRaUJWEUSkikLlm0bJJ8ESdW', 'admin', TRUE, 0, 1, FALSE, FALSE),
('Mitarbeiter Max', 'max@pfotencard.de', '$2b$12$ZJS4gBANdVT9x.bGQ2gmAOV15eRTKLRaUJWEUSkikLlm0bJJ8ESdW', 'mitarbeiter', TRUE, 0, 1, FALSE, FALSE),
('Sabine Mustermann', 'sabine@email.com', '$2b$12$ZJS4gBANdVT9x.bGQ2gmAOV15eRTKLRaUJWEUSkikLlm0bJJ8ESdW', 'kunde', TRUE, 150, 1, FALSE, FALSE),
('Jörg Schmidt', 'joerg@email.com', '$2b$12$ZJS4gBANdVT9x.bGQ2gmAOV15eRTKLRaUJWEUSkikLlm0bJJ8ESdW', 'kunde', TRUE, 55.5, 1, FALSE, FALSE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO dogs (owner_id, name, breed, birth_date) VALUES
(3, 'Bello', 'Golden Retriever', '2022-05-10'),
(4, 'Hasso', 'Schäferhund-Mix', '2021-01-20')
ON CONFLICT DO NOTHING;
