// Static content for the public website. Treatment salaries/prices shown are
// indicative "starting from" figures; API prices may be merged at runtime.

export const CLINIC = {
  name: 'Sai Dental Clinic',
  tagline: 'Modern, gentle & affordable dental care for the whole family',
  phone: '+91 98765 43210',
  phoneHref: 'tel:+919876543210',
  whatsapp: 'https://wa.me/919876543210',
  email: 'care@saidentalclinic.example',
  emailHref: 'mailto:care@saidentalclinic.example',
  address: 'First Floor, Sai Complex, MG Road, Sector 14, Gurugram, Haryana 122001',
  addressShort: 'Sai Complex, MG Road, Gurugram',
  hours: [
    { days: 'Monday – Saturday', time: '9:00 AM – 8:00 PM' },
    { days: 'Sunday', time: '10:00 AM – 2:00 PM (emergencies only)' },
  ],
  mapEmbed:
    'https://www.google.com/maps?q=MG%20Road%2C%20Gurugram%2C%20Haryana&z=14&output=embed',
  founded: '2012',
  patientsServed: 12000,
  yearsExperience: 12,
  doctors: 4,
}

export const TREATMENTS = [
  {
    slug: 'general-dentistry',
    title: 'General Dentistry',
    short: 'Routine check-ups, cleanings and fillings to keep your smile healthy.',
    description:
      'Your annual dental home. We combine thorough examinations with preventive advice so minor problems are caught before they become painful or expensive.',
    icon: 'stethoscope',
    includes: [
      'Comprehensive oral examination',
      'Digital X-ray diagnosis',
      'Composite tooth-coloured fillings',
      'Stainless steel & ceramic crowns',
      'Simple & surgical extractions',
    ],
    priceFrom: 400,
  },
  {
    slug: 'preventive-dentistry',
    title: 'Preventive Dentistry',
    short: 'Scaling, polishing, fluoride and sealants to stop problems before they start.',
    description:
      'Prevention is always less painful than a cure. Regular professional cleaning and protective treatments keep plaque, tartar and cavities at bay.',
    icon: 'shield',
    includes: [
      'Ultrasonic scaling & polishing',
      'Fluoride application',
      'Pit & fissure sealants',
      'Oral hygiene coaching',
      'Smoking & tobacco counselling',
    ],
    priceFrom: 800,
  },
  {
    slug: 'cosmetic-dentistry',
    title: 'Cosmetic Dentistry',
    short: 'Smile makeovers with veneers, shaping and whitening.',
    description:
      'We blend art with science to reshape, whiten and perfect your smile — discreet, comfortable treatments designed around your facial features.',
    icon: 'sparkle',
    includes: [
      'Porcelain veneers',
      'Dental bonding & reshaping',
      'Gum contouring',
      'Full smile makeover planning',
      'Tooth whitening',
    ],
    priceFrom: 2500,
  },
  {
    slug: 'root-canal-treatment',
    title: 'Root Canal Treatment',
    short: 'Single-visit, painless root canal treatment (RCT).',
    description:
      'Eliminate pain and save your natural tooth with modern rotary endodontics. Our single-visit RCT is quick, comfortable and virtually painless.',
    icon: 'rootCanal',
    includes: [
      'Digital X-ray diagnosis',
      'Rotary endodontics',
      'Single-sitting RCT',
      'Rubber dam isolation',
      'Post-RCT crown',
    ],
    priceFrom: 3500,
  },
  {
    slug: 'dental-implants',
    title: 'Dental Implants',
    short: 'Permanent, natural-looking replacements for missing teeth.',
    description:
      'Titanium implants replace tooth roots for the strongest, most lifelike solution to missing teeth — designed to last decades.',
    icon: 'implant',
    includes: [
      '3D implant planning',
      'Single & full-arch implants',
      'Implant-supported bridges',
      'All-on-4 concept',
      'Temporary crown during healing',
    ],
    priceFrom: 18000,
  },
  {
    slug: 'crowns-bridges',
    title: 'Crowns & Bridges',
    short: 'Restore damaged or missing teeth with strong, natural crowns.',
    description:
      'Ceramic crowns and bridges rebuild broken teeth and replace missing ones, restoring strength, function and a seamless appearance.',
    icon: 'crown',
    includes: [
      'Metal-free ceramic crowns',
      'Zirconia & E-max options',
      'Porcelain-fused-to-metal crowns',
      'Conventional bridges',
      'Chair-side shade matching',
    ],
    priceFrom: 3000,
  },
  {
    slug: 'teeth-whitening',
    title: 'Teeth Whitening',
    short: 'In-clinic and custom take-home whitening systems.',
    description:
      'Lift years of stains from tea, coffee and tobacco with professional whitening that is safe for your enamel and delivers visibly brighter results.',
    icon: 'whitening',
    includes: [
      'In-clinic power whitening',
      'Custom take-home trays',
      'Enamel-safe protocol',
      'Stain & shade assessment',
      'Desensitising care',
    ],
    priceFrom: 4000,
  },
  {
    slug: 'orthodontics',
    title: 'Orthodontics & Braces',
    short: 'Align teeth with metal, ceramic or clear aligners.',
    description:
      'Straighten crowded or crooked teeth for children and adults with braces or clear aligners, improving both smile aesthetics and bite function.',
    icon: 'braces',
    includes: [
      'Orthodontic assessment',
      'Metal & ceramic braces',
      'Clear aligner therapy',
      'Functional appliances',
      'Retainers & post-treatment care',
    ],
    priceFrom: 22000,
  },
  {
    slug: 'pediatric-dentistry',
    title: 'Pediatric Dentistry',
    short: 'Friendly, fear-free dental care designed for children.',
    description:
      'A warm, patient-first approach for kids — gentle check-ups, fluoride and fissure sealants, plus habits counselling that protects growing smiles.',
    icon: 'child',
    includes: [
      'Child-friendly check-ups',
      'Fluoride & sealant treatment',
      'Kids fillings',
      'Space maintainers',
      'Habit breaking appliances',
    ],
    priceFrom: 500,
  },
  {
    slug: 'oral-surgery',
    title: 'Oral Surgery',
    short: 'Wisdom tooth removal, surgical extraction and minor procedures.',
    description:
      'From impacted wisdom teeth to biopsies and minor surgeries, our surgical team operates with precision in a fully sterile environment.',
    icon: 'surgery',
    includes: [
      'Impacted wisdom tooth removal',
      'Surgical extractions',
      'Biopsy & minor surgery',
      'Alveoloplasty',
      'Post-operative recovery plan',
    ],
    priceFrom: 1800,
  },
  {
    slug: 'full-dentures',
    title: 'Complete & Partial Dentures',
    short: 'Comfortable, natural-looking removable teeth replacements.',
    description:
      'Bone-friendly, esthetically crafted dentures that restore chewing confidence and facial support where teeth have been lost.',
    icon: 'denture',
    includes: [
      'Complete dentures',
      'Partial chrome dentures',
      'Flexible dentures',
      'Immediate dentures',
      'Relining & adjustments',
    ],
    priceFrom: 9000,
  },
  {
    slug: 'gum-treatment',
    title: 'Gum & Periodontal Treatment',
    short: 'Manage bleeding gums, periodontitis and bone loss.',
    description:
      'Expert management of gum disease — from deep cleaning and root planing to surgical pocket therapy — to save your teeth and gums.',
    icon: 'gum',
    includes: [
      'Gum health screening',
      'Scaling & root planing',
      'Periodontal pocket therapy',
      'Gum surgery referrals',
      'Maintenance programme',
    ],
    priceFrom: 1200,
  },
]

export const TREATMENT_BY_SLUG = Object.fromEntries(TREATMENTS.map((t) => [t.slug, t]))

export const TESTIMONIALS = [
  {
    name: 'Priya S.',
    treatment: 'Root Canal Treatment',
    rating: 5,
    text: 'I was terrified of root canals, but the team made it completely painless and finished in one sitting. I felt zero anxiety the entire time.',
  },
  {
    name: 'Rahul K.',
    treatment: 'Dental Implants',
    rating: 5,
    text: 'The implant process was explained clearly with X-rays and a proper plan. Six months on, it feels completely natural. Worth every rupee.',
  },
  {
    name: 'Anita M.',
    treatment: 'Teeth Whitening',
    rating: 5,
    text: 'Subtle, natural-looking results with absolutely no sensitivity afterwards. The before/after photos amazed everyone at home.',
  },
  {
    name: 'Suresh R.',
    treatment: 'Clear Aligners',
    rating: 5,
    text: 'My teenage daughter finished her aligner treatment ahead of schedule. Regular follow-ups and honest guidance the whole way.',
  },
  {
    name: 'Meenakshi T.',
    treatment: 'Pediatric Dentistry',
    rating: 5,
    text: 'My 6-year-old actually looks forward to the dentist now. They explain everything in a child-friendly way — so gentle and patient.',
  },
  {
    name: 'Vikram N.',
    treatment: 'Oral Surgery',
    rating: 5,
    text: 'Wisdom tooth removed with minimal swelling and real aftercare follow-up calls. Professional and hygienic, spotless clinic.',
  },
]

export const WHY_CHOOSE_US = [
  {
    icon: 'trust',
    title: 'Gentle, honest care',
    text: 'Transparent diagnosis and treatment plans. We only recommend what you actually need.',
  },
  {
    icon: 'shield',
    title: 'Sterile & safe',
    text: 'Hospital-grade sterilisation for every instrument, in a spotless, modern clinic.',
  },
  {
    icon: 'sparkle',
    title: 'Advanced technology',
    text: 'Digital X-rays, rotary RCT and 3D diagnostics for precision and comfort.',
  },
  {
    icon: 'wallet',
    title: 'Honest pricing',
    text: 'Clear quotations before every procedure, with easy EMI and insurance assistance.',
  },
]

export const FACILITIES = [
  { icon: 'xray', title: 'Digital X-Ray & OPG', text: 'Low-dose digital imaging for accurate diagnosis.' },
  { icon: 'sterile', title: 'Full Sterilisation Suite', text: 'Class-B autoclaves and sealed instrument trays.' },
  { icon: 'chair', title: 'Modern Treatment Chairs', text: 'Comfortable, fully reclining clinical chairs.' },
  { icon: 'child', title: 'Kid-Friendly Lounge', text: 'A reassuring space that keeps children at ease.' },
  { icon: 'shield', title: 'Infection Control', text: 'Strict protocols protect every visitor.' },
  { icon: 'parking', title: 'Easy Access & Parking', text: 'Centrally located with hassle-free parking.' },
]

export const FAQS = [
  {
    q: 'How do I book an appointment?',
    a: 'Use the Book Appointment form on this website, call us directly, or walk in — our front desk will schedule the most convenient slot for you.',
  },
  {
    q: 'Do you accept walk-in patients?',
    a: 'Yes. Walk-ins are welcome, though priority is given to scheduled appointments. Call ahead to minimise waiting time.',
  },
  {
    q: 'Is root canal treatment painful?',
    a: 'No. With modern rotary endodontics and effective local anaesthesia, most patients report a near-painless experience, often completed in a single visit.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept cash, UPI, cards and bank transfers. EMI options are available for larger treatments like implants and orthodontics.',
  },
  {
    q: 'Do you treat children?',
    a: 'Absolutely. Our pediatric dentistry team specialises in making children feel comfortable and safe, from first visits to complex care.',
  },
  {
    q: 'What should I do in a dental emergency?',
    a: 'Call us immediately. We reserve emergency slots for severe pain, trauma, swelling or broken teeth, including limited Sunday hours.',
  },
]