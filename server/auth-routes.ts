import { Router } from 'express';
import passport from './passport-config';
import { db } from './db';
import { customers } from '@shared/customer-schema';
import { crmCustomers } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

const router = Router();

async function findCrmCustomerByEmail(email: string) {
  return db.query.crmCustomers.findFirst({
    where: sql`lower(${crmCustomers.email}) = ${email.toLowerCase()}`,
  });
}

async function ensureOAuthCrmCustomer(user: any, profile?: Record<string, string>) {
  const existing = await findCrmCustomerByEmail(user.email);
  if (existing) return existing;

  const [created] = await db.insert(crmCustomers).values({
    email: String(user.email).trim().toLowerCase(),
    passwordHash: user.passwordHash || null,
    firstName: user.firstName || 'Google',
    lastName: user.lastName || 'User',
    phone: profile?.phone || user.phone || null,
    country: profile?.country || user.country || null,
    province: profile?.province || user.province || null,
    cityRegion: profile?.cityRegion || user.cityRegion || null,
    address: profile?.address || user.address || null,
    postalCode: profile?.postalCode || user.postalCode || null,
    customerType: 'retail',
    customerStatus: 'active',
    customerSource: 'website',
    emailEnabled: true,
    isActive: true,
    createdBy: 'google_oauth',
  }).returning();
  return created;
}

async function saveCrmCustomerSession(req: any, customer: typeof crmCustomers.$inferSelect) {
  req.session.adminId = undefined;
  req.session.customUserId = undefined;
  req.session.customerId = customer.id;
  req.session.customerEmail = customer.email;
  req.session.crmCustomerId = customer.id;
  req.session.isAuthenticated = true;
  await new Promise<void>((resolve, reject) => {
    req.session.save((error: Error | null) => error ? reject(error) : resolve());
  });
}

function getGoogleCallbackUrl(req: any) {
  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const protocol = forwardedProto || req.protocol;
  const requestHost = String(req.get('host') || '').toLowerCase();
  const isDevelopmentHost =
    requestHost.includes('.replit.dev') ||
    requestHost.startsWith('localhost') ||
    requestHost.startsWith('127.0.0.1');

  if (isDevelopmentHost) {
    return `${protocol}://${requestHost}/api/auth/google/callback`;
  }

  return 'https://www.momtazchem.com/api/auth/google/callback';
}

function isGoogleDevelopmentHost(req: any) {
  const requestHost = String(req.get('host') || '').toLowerCase();
  return (
    requestHost.includes('.replit.dev') ||
    requestHost.startsWith('localhost') ||
    requestHost.startsWith('127.0.0.1')
  );
}

async function finishGoogleLogin(req: any, res: any, user: any) {
  let crmCustomer = await findCrmCustomerByEmail(String(user.email));
  if (crmCustomer?.isActive === false) {
    return res.redirect('/customer/login?error=account_inactive');
  }
  if (!crmCustomer && user.profileCompleted) {
    crmCustomer = await ensureOAuthCrmCustomer(user);
  }
  if (crmCustomer) {
    await saveCrmCustomerSession(req, crmCustomer);
    return res.redirect('/customer/profile');
  }

  console.log('✅ [GOOGLE CALLBACK] User authenticated:', {
    id: user.id,
    email: user.email,
    profileCompleted: user.profileCompleted
  });

  if (!user.profileCompleted) {
    return res.redirect('/complete-profile');
  }

  return res.redirect('/customer/profile');
}

// =============================================================================
// GOOGLE OAUTH ROUTES
// =============================================================================

// Initiate Google OAuth login
router.get('/google', (req, res, next) => {
  const requestHost = String(req.get('host') || '').toLowerCase();
  if (!isGoogleDevelopmentHost(req) && requestHost !== 'www.momtazchem.com') {
    return res.redirect('https://www.momtazchem.com/api/auth/google');
  }

  const callbackURL = getGoogleCallbackUrl(req);
  console.log('🔐 [GOOGLE AUTH] Starting OAuth with callback:', callbackURL);
  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
    state: true,
    callbackURL,
  } as any)(req, res, next);
});

// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  const callbackURL = getGoogleCallbackUrl(req);
  return passport.authenticate('google', {
    callbackURL,
    state: true,
  } as any, (authError: Error | null, user: any) => {
    if (authError || !user) {
      console.error('❌ [GOOGLE CALLBACK] OAuth exchange failed:', {
        message: authError?.message || 'Google did not return a user',
        callbackURL,
      });
      return res.redirect('/customer/login?error=google_auth_failed');
    }

    req.logIn(user, async (loginError: Error | null) => {
      if (loginError) {
        console.error('❌ [GOOGLE CALLBACK] Passport session failed:', loginError);
        return res.redirect('/customer/login?error=google_auth_failed');
      }

      try {
        return await finishGoogleLogin(req, res, user);
      } catch (error) {
        console.error('❌ [GOOGLE CALLBACK] Failed to create customer session:', error);
        return res.redirect('/customer/login?error=google_auth_failed');
      }
    });
  })(req, res, next);
});

// =============================================================================
// FACEBOOK OAUTH ROUTES
// =============================================================================

// Initiate Facebook OAuth login
router.get('/facebook',
  passport.authenticate('facebook', { 
    scope: ['email'],
    display: 'popup'
  })
);

// Facebook OAuth callback
router.get('/facebook/callback',
  passport.authenticate('facebook', { 
    failureRedirect: '/customer/login?error=facebook_auth_failed' 
  }),
  (req, res) => {
    const user = req.user as any;
    
    console.log('✅ [FACEBOOK CALLBACK] User authenticated:', {
      id: user.id,
      email: user.email,
      profileCompleted: user.profileCompleted
    });

    // Check if user needs to complete profile
    if (!user.profileCompleted) {
      console.log('🔄 [FACEBOOK CALLBACK] Redirecting to profile completion');
      return res.redirect('/complete-profile');
    }

    // User has completed profile, redirect to dashboard
    console.log('✅ [FACEBOOK CALLBACK] Profile complete, redirecting to dashboard');
    res.redirect('/customer/profile');
  }
);

// =============================================================================
// PROFILE COMPLETION ROUTE
// =============================================================================

// Complete user profile after OAuth login
router.post('/complete-profile', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    const user = req.user as any;
    const { phone, country, province, cityRegion, address, postalCode, whatsappNumber } = req.body;

    // Validate required fields
    if (!phone || !country || !province || !cityRegion || !address) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phone, country, province, city, address'
      });
    }

    console.log('📝 [PROFILE COMPLETION] Updating user profile:', {
      userId: user.id,
      email: user.email
    });

    // Update user profile
    await db.update(customers)
      .set({
        phone,
        country,
        province,
        cityRegion,
        address,
        postalCode: postalCode || null,
        whatsappNumber: whatsappNumber || null,
        profileCompleted: true,
        updatedAt: new Date()
      })
      .where(eq(customers.id, user.id));

    const crmCustomer = await ensureOAuthCrmCustomer(user, {
      phone,
      country,
      province,
      cityRegion,
      address,
      postalCode: postalCode || '',
    });
    if (crmCustomer.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Customer account is inactive',
      });
    }
    await saveCrmCustomerSession(req, crmCustomer);

    console.log('✅ [PROFILE COMPLETION] Profile updated successfully');

    res.json({
      success: true,
      message: 'Profile completed successfully',
      profileCompleted: true
    });
  } catch (error) {
    console.error('❌ [PROFILE COMPLETION] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get current user profile completion status
router.get('/profile-status', (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      authenticated: false
    });
  }

  const user = req.user as any;
  res.json({
    success: true,
    authenticated: true,
    profileCompleted: user.profileCompleted || false,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      oauthProvider: user.oauthProvider
    }
  });
});

export default router;
