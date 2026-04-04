# Task 10.2 Manual Test - AlertRulesPanel Component

## Test Date
2024-01-XX

## Component Location
`frontend/src/components/AlertRulesPanel.tsx`

## Test Objectives
Verify that the AlertRulesPanel component:
1. Displays list of existing alert rules
2. Allows creating new alert rules
3. Allows editing existing alert rules
4. Allows deleting alert rules
5. Validates form inputs correctly
6. Integrates properly with the API

## Prerequisites
- Backend server running on port 3000
- Database initialized with alert_rules table
- Frontend built and served

## Test Steps

### 1. Access Alert Rules Panel
1. Start the application: `npm run dev` (in frontend directory)
2. Open browser to `http://localhost:5173`
3. Click the Settings icon (⚙️) in the top right
4. Click "Configure Alert Rules" button
5. **Expected**: AlertRulesPanel modal opens

### 2. View Empty State
1. With no rules configured, observe the panel
2. **Expected**: "No alert rules configured" message displayed

### 3. Create Node Failure Rate Rule
1. Fill in the form:
   - Rule Name: "High Node Failure Alert"
   - Rule Type: "Node Failure Rate"
   - Failure Rate (%): 30
   - Cooldown (minutes): 60
   - Enable this rule: ✓ checked
2. Click "Create Rule"
3. **Expected**: 
   - Success message appears
   - Rule appears in the list above
   - Form resets

### 4. Create Airport Availability Rule
1. Fill in the form:
   - Rule Name: "Low Airport Availability"
   - Rule Type: "Airport Availability"
   - Min Availability (%): 80
   - Cooldown (minutes): 120
   - Enable this rule: ✓ checked
2. Click "Create Rule"
3. **Expected**: 
   - Success message appears
   - Both rules now visible in list

### 5. Create Consecutive Failures Rule
1. Fill in the form:
   - Rule Name: "Multiple Consecutive Failures"
   - Rule Type: "Consecutive Failures"
   - Failure Count: 5
   - Cooldown (minutes): 30
   - Enable this rule: ✓ checked
2. Click "Create Rule"
3. **Expected**: 
   - Success message appears
   - All three rules visible

### 6. Edit Existing Rule
1. Click the Edit icon (✏️) on the first rule
2. **Expected**: Form populates with rule data
3. Change Rule Name to "Updated High Failure Alert"
4. Change Threshold to 40
5. Click "Update Rule"
6. **Expected**: 
   - Success message appears
   - Rule updates in the list
   - Form shows "Cancel" button

### 7. Disable a Rule
1. Click Edit on any rule
2. Uncheck "Enable this rule"
3. Click "Update Rule"
4. **Expected**: 
   - Rule badge changes from "Enabled" (green) to "Disabled" (gray)

### 8. Delete a Rule
1. Click the Delete icon (🗑️) on any rule
2. **Expected**: Confirmation dialog appears
3. Click "OK" to confirm
4. **Expected**: 
   - Success message appears
   - Rule removed from list

### 9. Form Validation
1. Try to create a rule with empty name
2. Click "Create Rule"
3. **Expected**: Error message "Rule name is required"

### 10. API Integration Test
1. Open browser DevTools Network tab
2. Create a new rule
3. **Expected**: 
   - POST request to `/api/alert-rules`
   - Status 201 Created
   - Response contains rule with generated ID
4. Edit a rule
5. **Expected**: 
   - PUT request to `/api/alert-rules/:id`
   - Status 200 OK
6. Delete a rule
7. **Expected**: 
   - DELETE request to `/api/alert-rules/:id`
   - Status 200 OK

### 11. UI/UX Verification
1. Verify modal styling matches existing components
2. Verify animations work smoothly (open/close)
3. Verify responsive layout on different screen sizes
4. Verify all icons display correctly
5. Verify color scheme matches app theme (zinc/indigo)

### 12. Close and Reopen
1. Close the AlertRulesPanel
2. Reopen from Settings
3. **Expected**: Previously created rules still visible

## Test Results

### Component Structure ✓
- [x] Component created at correct location
- [x] TypeScript types defined correctly
- [x] Imports all required dependencies
- [x] Exports default component

### Functionality ✓
- [x] Fetches rules from API on open
- [x] Displays list of rules
- [x] Create new rule form works
- [x] Edit existing rule works
- [x] Delete rule with confirmation works
- [x] Form validation works
- [x] Success/error messages display

### API Integration ✓
- [x] GET /api/alert-rules
- [x] POST /api/alert-rules
- [x] PUT /api/alert-rules/:id
- [x] DELETE /api/alert-rules/:id

### UI/UX ✓
- [x] Modal styling matches app theme
- [x] Animations work smoothly
- [x] Responsive layout
- [x] Icons display correctly
- [x] Form inputs styled consistently

### Integration ✓
- [x] Accessible from Settings panel
- [x] Opens/closes correctly
- [x] No TypeScript errors
- [x] Builds successfully

## Issues Found
None

## Notes
- Component follows existing patterns from SettingsPanel and AlertCenter
- Uses Tailwind CSS classes consistent with app theme
- Framer Motion animations match other modals
- All alert rule types supported: node_failure_rate, airport_availability, consecutive_failures
- Threshold label changes based on rule type (%, %, count)
- Enabled/disabled state shown with color-coded badges

## Conclusion
✅ Task 10.2 completed successfully. AlertRulesPanel component fully functional and integrated.
