-- Test admin account for end-to-end portal verification (created 2026-07-13).
-- Clearly labeled; deactivate or delete after testing:
--   UPDATE users SET "isActive" = false WHERE email = 'testadmin@campusrentalsllc.com';
-- Idempotent: no-op if the account already exists.
INSERT INTO users (id, email, "firstName", "lastName", password, role, "isActive", "emailVerified", "createdAt", "updatedAt")
SELECT 'usr_test_admin_claude_2026', 'testadmin@campusrentalsllc.com', 'Test', 'Admin', '$2a$12$1DvvDexx0JTsBmXfk3KyA.fsk.e4WVq.vyv8nS9JSI8yY9X0WW2Su', 'ADMIN'::"UserRole", true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'testadmin@campusrentalsllc.com');
