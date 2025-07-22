# Signup Control Feature

This document describes the implementation of separate Login and Signup buttons with configurable signup controls.

## Overview

The authentication system now supports:
- Separate Login and Signup buttons in the login screen
- Configurable signup control via environment variables
- Existing users can always login, but new signups can be disabled
- Discord OAuth integration with signup prevention

## Changes Made

### 1. Login Screen UI (`src/components/login-screen.tsx`)
- Replaced single login button with dual-mode interface
- Added toggle between Login and Signup modes
- Added "Don't have an account? Sign up with Discord" link
- Added "Already have an account? Login to your account" link
- Added error display for signup failures
- Replaced `LOGIN_ENABLED` with `SIGNUP_ENABLED` configuration

### 2. Authentication Configuration (`src/lib/auth.ts`)
- Replaced `LOGIN_ENABLED` with `SIGNUP_ENABLED` environment variable
- Added database hooks to prevent user creation when signup is disabled
- Maintains Discord OAuth functionality for existing users

### 3. Main Page Handler (`src/app/page.tsx`)
- Added separate `handleDiscordSignup` function
- Added error handling for signup failures
- Added state management for signup errors

### 4. Environment Configuration (`.env.example`)
- Added `SIGNUP_ENABLED` and `NEXT_PUBLIC_SIGNUP_ENABLED` variables
- Documented Discord OAuth configuration
- Added database and auth secret configuration

### 5. Translations (`messages/en.json`, `messages/en-GB.json`)
- Added new translation keys for signup-related text:
  - `auth.signupDescription`
  - `auth.signupWithDiscord`
  - `auth.noAccount`
  - `auth.haveAccount`
  - `auth.loginToAccount`
  - `auth.signupDisabled`
  - `auth.signupDisabledMessage`
  - `auth.signupError`

## Configuration

### Environment Variables

Set these environment variables to control signup behavior:

```env
# Server-side signup control
SIGNUP_ENABLED=false

# Client-side signup control (must match server-side)
NEXT_PUBLIC_SIGNUP_ENABLED=false
```

### Behavior

- When `SIGNUP_ENABLED=false`:
  - Existing users can login normally
  - New users cannot create accounts
  - Signup button is disabled with warning message
  - Database hooks prevent user creation

- When `SIGNUP_ENABLED=true`:
  - Both login and signup work normally
  - New users can register via Discord OAuth
  - All authentication flows are enabled

## User Experience

### Login Mode (Default)
1. User sees "Continue with Discord" button
2. Below: "Don't have an account? Sign up with Discord" link
3. Clicking the link switches to Signup mode

### Signup Mode
1. User sees "Sign up with Discord" button
2. If signup disabled: Warning message appears
3. Below: "Already have an account? Login to your account" link
4. Clicking the link switches back to Login mode

### Error Handling
- Signup attempts when disabled show user-friendly error messages
- Errors are displayed in red boxes above the signup button
- Users can easily switch back to login mode

## Security Considerations

- Server-side validation prevents user creation even if client is bypassed
- Database hooks ensure no new users can be created when signup is disabled
- Existing authentication sessions remain valid
- Discord OAuth for existing users continues to work normally

## Future Enhancements

- Add email-based signup control (separate from OAuth)
- Add whitelist/blacklist functionality for specific users
- Add admin override capabilities
- Add audit logging for signup attempts