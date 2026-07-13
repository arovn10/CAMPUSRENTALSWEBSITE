INSERT INTO users (id, email, "firstName", "lastName", password, role, "isActive", "emailVerified", "createdAt", "updatedAt")
SELECT 'usr_test_admin_claude_2026', 'testadmin@campusrentalsllc.com', 'Test', 'Admin', '$2a$12$CM/kqlk9KrEoY2gKpj7IUeABgnflBqGx11SRlc.FOOtqmUnrsdjQe', 'ADMIN'::"UserRole", true, true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'testadmin@campusrentalsllc.com');
-- Test admin for end-to-end portal verification (2026-07-13). Idempotent.
-- NOTE: comments must trail the statement — the runner skips any statement
-- that BEGINS with '--' (add-00 variant executed 0 statements for this reason).
-- Deactivate after testing:
--   UPDATE users SET "isActive" = false WHERE email = 'testadmin@campusrentalsllc.com';
