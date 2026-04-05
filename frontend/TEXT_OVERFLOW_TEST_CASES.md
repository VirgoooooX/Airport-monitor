# Text Overflow Test Cases

## Test Data for Manual Verification

### 1. NodeCard Component

#### Test Case 1.1: Long Node Name (English)
```
Name: "Super Long Node Name That Should Be Truncated With Ellipsis When It Exceeds The Container Width"
Address: "very-long-subdomain.example-domain.com"
Port: 8080
Protocol: "vmess"
```

#### Test Case 1.2: Long Node Name (Chinese)
```
Name: "这是一个非常长的节点名称用于测试文本溢出处理功能是否正常工作在中文环境下"
Address: "cn-beijing-node-01.example.com"
Port: 443
Protocol: "trojan"
```

#### Test Case 1.3: Long Address
```
Name: "HK Node"
Address: "very-very-very-long-subdomain-name.example-domain-with-long-name.com"
Port: 443
Protocol: "vless"
```

**Expected Behavior**:
- Node name should truncate with ellipsis
- Hovering shows full name in tooltip
- Address should truncate with ellipsis
- Protocol badge should not shrink
- Minimum width maintained for readability

---

### 2. Toast Component

#### Test Case 2.1: Long Success Message
```
Type: success
Message: "Successfully imported subscription from https://example.com/subscription/very-long-url-path with 150 nodes. All nodes have been validated and added to the monitoring system. The system will start checking these nodes in the next cycle."
```

#### Test Case 2.2: Long Error Message (Chinese)
```
Type: error
Message: "导入订阅失败：无法连接到订阅服务器。请检查您的网络连接，确保订阅链接正确，并且服务器没有被防火墙阻止。如果问题持续存在，请联系管理员获取帮助。错误代码：ECONNREFUSED"
```

#### Test Case 2.3: Very Long Warning
```
Type: warning
Message: "Warning: The monitoring engine has detected that 25 out of 100 nodes are currently offline. This may indicate a network issue or server maintenance. The system will continue to monitor these nodes and will automatically restore them when they come back online. Please check the node details for more information about the specific nodes that are affected."
```

**Expected Behavior**:
- Message should be limited to 3 lines
- Text should break at word boundaries
- Ellipsis shown after 3rd line
- Hovering shows full message in tooltip
- Close button should remain visible

---

### 3. AlertCenter Component

#### Test Case 3.1: Long Critical Alert
```
Severity: critical
Message: "Critical: Node 'US-West-Coast-Premium-Server-01' has been offline for more than 30 minutes. This may affect service availability for users in the western United States region. Immediate action required."
```

#### Test Case 3.2: Long Warning Alert (Chinese)
```
Severity: warning
Message: "警告：节点'香港高级服务器-01'的延迟已超过阈值500毫秒，当前延迟为850毫秒。这可能会影响用户体验。建议检查网络连接或考虑切换到其他节点。"
```

#### Test Case 3.3: Multiple Long Alerts
Test with 5+ alerts with long messages to verify scrolling and layout.

**Expected Behavior**:
- Alert message limited to 2 lines
- Text breaks at word boundaries
- Ellipsis shown after 2nd line
- Hovering shows full message in tooltip
- Severity badge and timestamp should not shrink
- Acknowledge button remains accessible

---

### 4. TabNavigation Component

#### Test Case 4.1: Long Tab Labels (English)
```
Tabs:
- "General Configuration Settings"
- "Subscription Management and Import"
- "Advanced Check Configuration"
- "Alert Rules and Notifications"
- "Appearance and Localization"
```

#### Test Case 4.2: Long Tab Labels (Chinese)
```
Tabs:
- "常规配置设置"
- "订阅管理和导入"
- "高级检查配置"
- "告警规则和通知"
- "外观和本地化设置"
```

**Expected Behavior**:
- Tab labels should truncate with ellipsis
- Hovering shows full label in tooltip
- Tabs should maintain minimum width of 80px
- Tabs should not exceed maximum width of 200px
- Icons and unsaved indicators should remain visible
- Horizontal scrolling should work on mobile

---

### 5. NodeDetailDrawer Component

#### Test Case 5.1: Long Node Name in Drawer
```
Name: "Premium High-Speed Server Node Located in Singapore Data Center with Advanced DDoS Protection"
Protocol: "vmess"
```

#### Test Case 5.2: Long Node Name (Chinese)
```
Name: "位于新加坡数据中心的高级高速服务器节点配备先进的DDoS防护系统"
Protocol: "trojan"
```

**Expected Behavior**:
- Node name should truncate with ellipsis
- Hovering shows full name in tooltip
- Close button should remain visible and accessible
- Protocol badge should display correctly

---

### 6. RegionalStatsPanel Component

#### Test Case 6.1: Long Region Names
```
Regions:
- "Asia-Pacific-Southeast-Extended"
- "North-America-West-Coast-Premium"
- "Europe-Central-High-Performance"
```

#### Test Case 6.2: Long Country Names
```
Countries:
- "United States of America"
- "United Kingdom of Great Britain"
- "Democratic Republic of the Congo"
```

#### Test Case 6.3: Long Region Names (Chinese)
```
Regions:
- "亚太地区东南部扩展区域"
- "北美西海岸高级服务区"
- "欧洲中部高性能区域"
```

**Expected Behavior**:
- Region names should truncate with ellipsis
- Hovering shows full name in tooltip
- Node count badge should not shrink
- Country names should truncate with ellipsis
- Percentage values should remain visible

---

## Responsive Testing Checklist

### Mobile (320px - 767px)
- [ ] NodeCard displays correctly with truncated text
- [ ] Toast messages are readable and don't overflow
- [ ] Alert panel fits screen width
- [ ] Tab navigation scrolls horizontally
- [ ] Tab labels show abbreviated version
- [ ] NodeDetailDrawer fits screen width
- [ ] RegionalStatsPanel cards stack vertically

### Tablet (768px - 1023px)
- [ ] All components scale appropriately
- [ ] Text truncation works correctly
- [ ] Tab labels show full text (if space allows)
- [ ] Grid layouts adjust to 2 columns

### Desktop (1024px+)
- [ ] All components display optimally
- [ ] Text truncation only occurs when necessary
- [ ] Tab labels show full text
- [ ] Grid layouts show 3 columns

---

## Browser Testing Checklist

### Chrome/Edge
- [ ] Truncate works correctly
- [ ] Line-clamp works correctly
- [ ] Tooltips show on hover
- [ ] No layout shifts

### Firefox
- [ ] Truncate works correctly
- [ ] Line-clamp works correctly
- [ ] Tooltips show on hover
- [ ] No layout shifts

### Safari
- [ ] Truncate works correctly
- [ ] Line-clamp works correctly
- [ ] Tooltips show on hover
- [ ] No layout shifts

---

## Language Testing Checklist

### English
- [ ] All text displays correctly
- [ ] Truncation works as expected
- [ ] No overflow issues

### Chinese (Simplified)
- [ ] All text displays correctly
- [ ] Truncation works with Chinese characters
- [ ] No overflow issues
- [ ] Chinese punctuation displays correctly

### Mixed Content
- [ ] English + Chinese mixed text displays correctly
- [ ] Truncation works with mixed content
- [ ] No layout issues

---

## Accessibility Testing

- [ ] Truncated text has title attribute for screen readers
- [ ] Keyboard navigation works correctly
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Text remains readable at 200% zoom

---

## Performance Testing

- [ ] No layout thrashing during text truncation
- [ ] Smooth scrolling in alert panel
- [ ] No performance degradation with many nodes
- [ ] Responsive to window resize

---

## Edge Cases

### Empty or Null Values
- [ ] Empty node name displays placeholder
- [ ] Null address handled gracefully
- [ ] Empty alert message handled

### Special Characters
- [ ] Emoji in node names display correctly
- [ ] Special characters (©, ®, ™) display correctly
- [ ] Unicode characters display correctly

### Very Short Text
- [ ] Short text doesn't trigger truncation unnecessarily
- [ ] Minimum widths don't cause issues with short text

### Very Long Single Words
- [ ] Long URLs break correctly
- [ ] Long domain names break correctly
- [ ] Long words without spaces break correctly
