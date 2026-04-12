@feature_id:ddeab141-7dd6-4f38-beef-7a1ddf695eff
@epic_id:65d365d6-c552-46ca-80f4-ca311941fb1b
Feature: User Registration and Authentication
  Allow users to register and authenticate using email and password.

  @scenario_id:5313c425-dc8c-4352-b350-b161fffa0ee0
  @scenario_type:UI
  @ui_test
  Scenario: Successful User Registration
    # Scenario ID: 5313c425-dc8c-4352-b350-b161fffa0ee0
    # Feature ID: ddeab141-7dd6-4f38-beef-7a1ddf695eff
    # Scenario Type: UI
    # Description: Test the user registration process with valid email and password.
    Given I navigate to "/register"
    When I fill "email" with "${random_email}"
    And I fill "password" with "${random_password}"
    And I select "Homeowner" from "role"
    And I click "Create Account"
    Then I should see "BidWork"
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=ddeab141-7dd6-4f38-beef-7a1ddf695eff, scenario_id=5313c425-dc8c-4352-b350-b161fffa0ee0, type=UI

  @scenario_id:405c4db3-406a-47e6-a368-1f8496984d10
  @scenario_type:UI
  @ui_test
  Scenario: User Registration with Existing Email
    # Scenario ID: 405c4db3-406a-47e6-a368-1f8496984d10
    # Feature ID: ddeab141-7dd6-4f38-beef-7a1ddf695eff
    # Scenario Type: UI
    # Description: Test the user registration process with an email that is already registered.
    Given I navigate to "/register"
    When I fill "email" with "${login:email}"
    And I fill "password" with "${random_password}"
    And I select "Homeowner" from "role"
    And I click "Create Account"
    Then I should see "Email already registered"
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=ddeab141-7dd6-4f38-beef-7a1ddf695eff, scenario_id=405c4db3-406a-47e6-a368-1f8496984d10, type=UI

  @scenario_id:2e3f2938-4096-4af8-a9b7-e87eaf531fd4
  @scenario_type:UI
  @ui_test
  Scenario: Successful User Login
    # Scenario ID: 2e3f2938-4096-4af8-a9b7-e87eaf531fd4
    # Feature ID: ddeab141-7dd6-4f38-beef-7a1ddf695eff
    # Scenario Type: UI
    # Description: Test the user login process with valid credentials.
    Given I navigate to "/login"
    When I fill "email" with "${login:email}"
    And I fill "password" with "${login:password}"
    And I click "Sign In"
    Then I should see "BidWork"
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=ddeab141-7dd6-4f38-beef-7a1ddf695eff, scenario_id=2e3f2938-4096-4af8-a9b7-e87eaf531fd4, type=UI

  @scenario_id:7b6b41af-367e-4a70-aa0c-f2f18e499d52
  @scenario_type:UI
  @ui_test
  Scenario: User Login with Invalid Credentials
    # Scenario ID: 7b6b41af-367e-4a70-aa0c-f2f18e499d52
    # Feature ID: ddeab141-7dd6-4f38-beef-7a1ddf695eff
    # Scenario Type: UI
    # Description: Test the user login process with invalid credentials.
    Given I navigate to "/login"
    When I fill "email" with "${login:email}"
    And I fill "password" with "WrongPassword123!"
    And I click "Sign In"
    Then I should see "Invalid email or password"
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=ddeab141-7dd6-4f38-beef-7a1ddf695eff, scenario_id=7b6b41af-367e-4a70-aa0c-f2f18e499d52, type=UI
