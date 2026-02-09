const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

module.exports = function (passport) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
                scope: ['profile', 'email']
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Extract email from Google profile
                    const email = profile.emails[0].value;

                    // 1. Check if user exists by googleId
                    let user = await User.findOne({ googleId: profile.id });

                    if (user) {
                        // Existing Google user - update lastLogin
                        user.lastLogin = new Date();
                        await user.save();
                        return done(null, user);
                    }

                    // 2. Check if email already registered (local account)
                    user = await User.findOne({ email });

                    if (user) {
                        // Link Google to existing account
                        user.googleId = profile.id;
                        user.avatar = profile.photos[0]?.value;
                        user.lastLogin = new Date();
                        // Keep authProvider as 'local' if they already have password
                        await user.save();
                        return done(null, user);
                    }

                    // 3. Create new user from Google profile
                    user = await User.create({
                        firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
                        lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
                        email: email,
                        googleId: profile.id,
                        authProvider: 'google',
                        avatar: profile.photos[0]?.value,
                        isVerified: true,  // Google emails are pre-verified
                        lastLogin: new Date()
                    });

                    return done(null, user);
                } catch (error) {
                    console.error('Google OAuth error:', error);
                    return done(error, null);
                }
            }
        )
    );

    // Serialize user for session (if using sessions)
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
};
