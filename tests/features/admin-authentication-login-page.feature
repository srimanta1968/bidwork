@feature_id:827c5af0-bb13-4e67-9e6f-f621f1fe87e5
@epic_id:b4d11c00-d7be-4ef0-95b3-fd0ad8cfeb6a
Feature: Admin Authentication & Login Page
  Separate admin-only login page at the admin portal URL. Admin users have a distinct role ('admin') in the users table. Login endpoint validates the user is an admin before issuing a JWT with admin claims. Non-admin users attempting to log in see an 'Unauthorized - Admin access only' error. JWT includes admin role for middleware validation. Session management with auto-logout on token expiry.

  @scenario_id:7c073a97-13d3-4ff6-a252-9c0e99cb80c8
  @scenario_type:api
  Scenario: Create admin authentication backend endpoints
    # Scenario ID: 7c073a97-13d3-4ff6-a252-9c0e99cb80c8
    # Feature ID: 827c5af0-bb13-4e67-9e6f-f621f1fe87e5
    # Scenario Type: api
    # Description: POST /api/admin/auth/login - validates credentials AND admin role. Returns JWT with admin claims. Create admin-only middleware that checks JWT for admin role. POST /api/admin/auth/refresh for token refresh. Add admin role to users table enum.
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=827c5af0-bb13-4e67-9e6f-f621f1fe87e5, scenario_id=7c073a97-13d3-4ff6-a252-9c0e99cb80c8, type=api

  @scenario_id:defc9dde-5018-4552-9128-69bce35af8fb
  @scenario_type:api
  Scenario: Build admin login page and auth guards
    # Scenario ID: defc9dde-5018-4552-9128-69bce35af8fb
    # Feature ID: 827c5af0-bb13-4e67-9e6f-f621f1fe87e5
    # Scenario Type: api
    # Description: Admin login page with email/password form. 'Unauthorized' error for non-admin users. Auth context provider storing admin JWT. Protected route wrapper redirecting to login if not authenticated. Auto-logout on token expiry.
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=827c5af0-bb13-4e67-9e6f-f621f1fe87e5, scenario_id=defc9dde-5018-4552-9128-69bce35af8fb, type=api
