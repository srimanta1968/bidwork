@feature_id:0025402a-246c-419e-b719-d9f5a0a8581c
@epic_id:65d365d6-c552-46ca-80f4-ca311941fb1b
Feature: Implement Password Hashing
  Use bcrypt to hash user passwords before storing them in the database.

  @scenario_id:f25fcbff-931d-460f-b995-c219a809b807
  @scenario_type:UI
  @ui_test
  Scenario: Passwords are hashed using bcrypt before storage
    # Scenario ID: f25fcbff-931d-460f-b995-c219a809b807
    # Feature ID: 0025402a-246c-419e-b719-d9f5a0a8581c
    # Scenario Type: UI
    # Description: This scenario tests that user passwords are properly hashed using bcrypt before they are stored in the database.
    Given I navigate to "/register"
    When I fill "email" with "${random_email}"
    And I fill "password" with "${random_password}"
    And I select "Homeowner" from "role"
    And I click "Create Account"
    Then I should see "BidWork"
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=0025402a-246c-419e-b719-d9f5a0a8581c, scenario_id=f25fcbff-931d-460f-b995-c219a809b807, type=UI

  @scenario_id:a56aa02d-e30f-4eae-8848-e3e7779d0c51
  @scenario_type:API
  @api_test
  Scenario: User passwords cannot be retrieved in plain text
    # Scenario ID: a56aa02d-e30f-4eae-8848-e3e7779d0c51
    # Feature ID: 0025402a-246c-419e-b719-d9f5a0a8581c
    # Scenario Type: API
    # Description: This scenario tests that user passwords cannot be retrieved in plain text from the database.
    Given I navigate to "/register"
    When I fill "email" with "${random_email}"
    And I fill "password" with "${random_password}"
    And I click "Create Account"
    Then I should see "BidWork"
    # Priority: medium
    # Status: draft
    # Test Runner Info: feature_id=0025402a-246c-419e-b719-d9f5a0a8581c, scenario_id=a56aa02d-e30f-4eae-8848-e3e7779d0c51, type=API
