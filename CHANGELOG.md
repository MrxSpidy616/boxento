# What's New

## June 17, 2025

### 🎉 Major UX Improvement: Clear Local-Only Mode
• Local Mode Indicator: Shows "Local Mode" when Firebase is not configured
• Hidden Authentication UI: No more broken login buttons when running locally
• Immediate Functionality: Start using Boxento right away without any setup

### 🐛 Bug Fixes
• Fixed Authentication Confusion (Issue #35): Resolved "Firebase: Error (auth/api-key-not-valid)" when running locally
• Fixed RSS Widget Persistence (Issue #42): RSS feed settings now save correctly after page refresh
• Fixed XSS Security Vulnerabilities (Issues #6-#9): YouTube widget now properly sanitizes video IDs

### 🔒 Security Improvements
• Added URL encoding for all YouTube widget video ID parameters
• Prevented potential code injection through malicious video IDs
• Enhanced input sanitization across all widgets

### 📚 Documentation
• Added comprehensive "Operating Modes" section to README
• Clear explanation of Local-Only vs Cloud Sync modes
• Updated Docker examples with zero-configuration setup
• Added troubleshooting guide for common setup issues

### 🐳 Docker Experience
• Perfect local-only experience with zero configuration required
• No Firebase setup needed for basic functionality
• Clear visual indicators of operating mode

### 🔧 Technical Improvements
• Fixed TypeScript compilation errors that prevented Docker builds
• Improved widget type system with standardized callback interfaces
• Enhanced error handling for missing dependencies
• Standardized configuration persistence across all widgets

## March 20, 2025

### What's new
• Smart Favicon: Dynamic browser icon that shows your Pomodoro timer, weather, or date in a sleek squircle design
• Todoist Integration: Seamlessly manage your Todoist tasks right from your dashboard
• Year Progress Widget: Visualize your progress through the year with a customizable grid of dots

## March 19, 2025

### What's new
• Smart URL Detection: Copy any YouTube URL and we'll create a widget instantly!
• Sync Status: See when your changes are being saved in real-time
• Dark Mode: Better visibility across all widgets

### Improvements
• Smoother drag and drop for widget rearrangement
• Better widget resizing experience

## March 5, 2025

### Welcome to Boxento! 🎉

• Flexible Layout: Arrange widgets your way
• Dark Mode: Easy on the eyes
• Cloud Sync: Your dashboard, everywhere
• Widget Collection:
  - Weather forecasts
  - Google Calendar
  - World Clocks
  - Todo lists
  - Quick Links
  - Currency Converter
  - RSS Reader
  - Notes
  - Flight Tracker
  - Geography Quiz
  - GitHub Streak
  - Pomodoro Timer 