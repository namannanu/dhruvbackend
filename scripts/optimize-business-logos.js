const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', 'src', 'config', 'config.env') });

const connectDB = require('../src/config/db');
const Business = require('../src/modules/businesses/business.model');
const {
  createLogoSignature,
  generateLogoVariants,
  isDataUri
} = require('../src/shared/utils/logoUrlMinimizer');

const LOGO_CONTEXT_TO_FIELD = [
  { context: 'job-list', field: 'logoSmall' },
  { context: 'business-profile', field: 'logoMedium' }
];

const resolveLogoSource = (business) => {
  if (!business) return null;

  const candidates = [
    business.logo?.square?.url,
    business.logo?.square?.dataUri,
    business.logo?.original?.url,
    business.logo?.original?.dataUri,
    business.logo?.dataUri,
    typeof business.logo === 'string' ? business.logo : null,
    business.logoUrl
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim().length);
};

const optimizeBusiness = async (businessDoc) => {
  const business = businessDoc.toObject();
  const logoSource = resolveLogoSource(business);
  if (!logoSource) {
    return { skipped: true };
  }

  const signature = createLogoSignature(logoSource);
  const existingSignature = business.logoSignature || null;
  const signatureChanged =
    Boolean(signature && existingSignature && signature !== existingSignature);

  const missingContexts = LOGO_CONTEXT_TO_FIELD.filter(({ field }) => !business[field]).map(
    ({ context }) => context
  );

  const contextsToGenerate = signatureChanged
    ? LOGO_CONTEXT_TO_FIELD.map(({ context }) => context)
    : missingContexts;

  if (!contextsToGenerate.length && existingSignature) {
    return { skipped: true };
  }

  let variants = {};
  if (contextsToGenerate.length) {
    variants = await generateLogoVariants(logoSource, contextsToGenerate);
  }

  const updatePayload = {};
  LOGO_CONTEXT_TO_FIELD.forEach(({ context, field }) => {
    if (variants[context]) {
      updatePayload[field] = variants[context];
    }
  });

  if (signature) {
    updatePayload.logoSignature = signature;
    updatePayload.logoOptimizedAt = new Date();
  }

  if (Object.keys(updatePayload).length === 0) {
    return { skipped: true };
  }

  await Business.updateOne(
    { _id: businessDoc._id },
    { $set: updatePayload }
  );

  return {
    optimized: contextsToGenerate.length > 0,
    inline: isDataUri(logoSource)
  };
};

const main = async () => {
  await connectDB();

  console.log('🔍 Optimizing business logos...\n');

  const cursor = Business.find({
    $or: [
      { logo: { $exists: true, $ne: null } },
      { logoUrl: { $exists: true, $ne: null } }
    ]
  })
    .select('+logo +logoUrl +logoSmall +logoMedium +logoSignature')
    .cursor();

  let processed = 0;
  let optimizedCount = 0;
  let inlineOptimized = 0;

  for await (const business of cursor) {
    // eslint-disable-next-line no-await-in-loop
    const result = await optimizeBusiness(business);
    processed += 1;

    if (result.optimized) {
      optimizedCount += 1;
      if (result.inline) {
        inlineOptimized += 1;
      }
    }

    if (processed % 25 === 0) {
      console.log(
        `   • Processed ${processed} businesses | New variants: ${optimizedCount} (inline: ${inlineOptimized})`
      );
    }
  }

  console.log('\n✅ Optimization complete!');
  console.log(`   Businesses scanned: ${processed}`);
  console.log(`   Businesses updated: ${optimizedCount}`);
  console.log(`   Inline logos optimized: ${inlineOptimized}\n`);

  process.exit(0);
};

main().catch((err) => {
  console.error('❌ Failed to optimize business logos:', err);
  process.exit(1);
});
