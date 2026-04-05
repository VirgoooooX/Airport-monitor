# Task 7.4 Manual Test Guide: Tab State Management

## Test Environment
- Frontend dev server running at: http://localhost:5173
- Backend API should be running for full functionality

## Test Scenarios

### Test 1: Basic State Preservation - General Tab
**Objective**: Verify that form data is preserved when switching tabs

**Steps**:
1. Open the application in browser
2. Click the Settings icon to open Settings Panel
3. Verify you're on the "General" tab (should be active by default)
4. Change "Check Interval" from 300 to 500
5. Change "Check Timeout" from 30 to 45
6. **Verify**: An amber dot appears next to "General" tab label
7. Click on "Subscription" tab
8. Click back on "General" tab
9. **Verify**: Check Interval is still 500
10. **Verify**: Check Timeout is still 45
11. **Verify**: Amber dot is still visible

**Expected Result**: ✅ Form values are preserved, amber dot indicates unsaved changes

---

### Test 2: State Preservation - Subscription Tab
**Objective**: Verify subscription form data is preserved

**Steps**:
1. In Settings Panel, click "Subscription" tab
2. Enter "Test Airport" in Airport Name field
3. Enter "https://example.com/subscription" in URL field
4. **Verify**: Amber dot appears next to "Subscription" tab label
5. Click on "General" tab
6. Click back on "Subscription" tab
7. **Verify**: Airport Name is still "Test Airport"
8. **Verify**: URL is still "https://example.com/subscription"
9. **Verify**: Amber dot is still visible

**Expected Result**: ✅ Subscription form data is preserved

---

### Test 3: State Preservation - Check Config Tab
**Objective**: Verify check configuration data is preserved

**Steps**:
1. In Settings Panel, click "Check Config" tab
2. Change "TCP Timeout" from 30 to 25
3. Change "HTTP Timeout" from 30 to 35
4. Change "HTTP Test URL" to "https://www.cloudflare.com"
5. **Verify**: Amber dot appears next to "Check Config" tab label
6. Click on "General" tab
7. Click back on "Check Config" tab
8. **Verify**: TCP Timeout is still 25
9. **Verify**: HTTP Timeout is still 35
10. **Verify**: HTTP Test URL is still "https://www.cloudflare.com"
11. **Verify**: Amber dot is still visible

**Expected Result**: ✅ Check config data is preserved

---

### Test 4: Multiple Tabs with Unsaved Changes
**Objective**: Verify multiple tabs can have unsaved changes simultaneously

**Steps**:
1. In Settings Panel, go to "General" tab
2. Change Check Interval to 600
3. **Verify**: Amber dot on "General" tab
4. Go to "Subscription" tab
5. Enter "Airport 2" in Airport Name
6. **Verify**: Amber dots on both "General" and "Subscription" tabs
7. Go to "Check Config" tab
8. Change TCP Timeout to 20
9. **Verify**: Amber dots on "General", "Subscription", and "Check Config" tabs
10. Click through all tabs
11. **Verify**: All data is preserved in each tab

**Expected Result**: ✅ Multiple tabs can have unsaved changes, all data preserved

---

### Test 5: Clearing Unsaved Changes After Save
**Objective**: Verify amber dot disappears after successful save

**Steps**:
1. In Settings Panel, go to "General" tab
2. Change Check Interval to 400
3. **Verify**: Amber dot appears on "General" tab
4. Click "Save" button
5. Wait for success message
6. **Verify**: Amber dot disappears from "General" tab
7. Go to "Subscription" tab and back to "General"
8. **Verify**: Check Interval is still 400 (saved value)
9. **Verify**: No amber dot on "General" tab

**Expected Result**: ✅ Amber dot removed after successful save

---

### Test 6: State Cleared on Panel Close
**Objective**: Verify state is cleared when panel is closed

**Steps**:
1. In Settings Panel, go to "General" tab
2. Change Check Interval to 700
3. **Verify**: Amber dot appears
4. Go to "Subscription" tab
5. Enter "Temp Airport" in Airport Name
6. **Verify**: Amber dots on both tabs
7. Click the X button to close Settings Panel
8. Reopen Settings Panel
9. Go to "General" tab
10. **Verify**: Check Interval is back to original value (not 700)
11. **Verify**: No amber dot on "General" tab
12. Go to "Subscription" tab
13. **Verify**: Airport Name field is empty (not "Temp Airport")
14. **Verify**: No amber dot on "Subscription" tab

**Expected Result**: ✅ All unsaved data is cleared when panel closes

---

### Test 7: Rapid Tab Switching
**Objective**: Verify state management handles rapid tab switching

**Steps**:
1. In Settings Panel, go to "General" tab
2. Change Check Interval to 555
3. Quickly click: Subscription → Check Config → General → Subscription → General
4. **Verify**: Check Interval is still 555
5. **Verify**: No errors in browser console
6. **Verify**: UI remains responsive

**Expected Result**: ✅ State preserved even with rapid switching

---

### Test 8: Import Mode Preservation in Subscription Tab
**Objective**: Verify import mode selection is preserved

**Steps**:
1. In Settings Panel, go to "Subscription" tab
2. Click "Raw" import mode button
3. Enter some text in the textarea
4. Go to "General" tab
5. Return to "Subscription" tab
6. **Verify**: "Raw" mode is still selected
7. **Verify**: Textarea content is preserved
8. Click "File" import mode button
9. Go to "General" tab and back
10. **Verify**: "File" mode is still selected

**Expected Result**: ✅ Import mode and content preserved

---

### Test 9: Visual Indicator Accessibility
**Objective**: Verify amber dot indicator is visible and accessible

**Steps**:
1. In Settings Panel, go to "General" tab
2. Change Check Interval to 800
3. **Verify**: Amber dot is clearly visible next to "General" label
4. Hover over the amber dot
5. **Verify**: Tooltip shows "Unsaved changes"
6. Use browser inspector to check aria-label
7. **Verify**: aria-label="Has unsaved changes" is present

**Expected Result**: ✅ Indicator is visible and accessible

---

### Test 10: No State Management for Non-Form Tabs
**Objective**: Verify AlertRules and Appearance tabs don't show indicators

**Steps**:
1. In Settings Panel, go to "Alert Rules" tab
2. **Verify**: No amber dot appears (tab has no form inputs)
3. Go to "Appearance" tab
4. Change language selection
5. **Verify**: No amber dot appears (language changes are immediate)
6. Go to "General" tab
7. Change Check Interval
8. **Verify**: Only "General" tab has amber dot

**Expected Result**: ✅ Only form tabs show unsaved changes indicators

---

## Browser Console Checks

During all tests, monitor the browser console for:
- ❌ No TypeScript errors
- ❌ No React warnings
- ❌ No state update errors
- ❌ No memory leaks

## Performance Checks

- Tab switching should be smooth (< 200ms)
- No lag when typing in form fields
- No flickering when switching tabs
- Amber dot appears/disappears smoothly

## Accessibility Checks

- Tab navigation works with keyboard (Tab key)
- Amber dot has proper ARIA labels
- Screen reader announces unsaved changes
- Focus management works correctly

## Test Results Template

```
Test Date: ___________
Tester: ___________

Test 1: [ ] Pass [ ] Fail - Notes: ___________
Test 2: [ ] Pass [ ] Fail - Notes: ___________
Test 3: [ ] Pass [ ] Fail - Notes: ___________
Test 4: [ ] Pass [ ] Fail - Notes: ___________
Test 5: [ ] Pass [ ] Fail - Notes: ___________
Test 6: [ ] Pass [ ] Fail - Notes: ___________
Test 7: [ ] Pass [ ] Fail - Notes: ___________
Test 8: [ ] Pass [ ] Fail - Notes: ___________
Test 9: [ ] Pass [ ] Fail - Notes: ___________
Test 10: [ ] Pass [ ] Fail - Notes: ___________

Overall Result: [ ] All Pass [ ] Some Failures

Issues Found:
1. ___________
2. ___________
3. ___________
```

## Known Limitations

1. State is stored in memory only (cleared on panel close) - This is intentional
2. No persistence to localStorage - User must save to persist changes
3. File selection in Subscription tab is not preserved (File objects cannot be serialized)

## Success Criteria

✅ All 10 test scenarios pass
✅ No console errors during testing
✅ Smooth performance (< 200ms tab switching)
✅ Amber dot indicators work correctly
✅ Data preservation works across all form tabs
✅ Unsaved changes cleared after save
✅ State cleared when panel closes
