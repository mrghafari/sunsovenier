export type Language = 'en' | 'ar' | 'tr' | 'fa';

export interface Translation {
  // Navigation
  home: string;
  about: string;
  services: string;
  products: string;
  contact: string;
  shop: {
    title: string;
    lowStockWarning: string;
    priceFilter: string;
    minPrice: string;
    maxPrice: string;
    inStock: string;
    outOfStock: string;
    volumeDeals: string;
    active: string;
    off: string;
    more: string;
    items: string;
    max: string;
    buy: string;
    catalog: string;
    addToCart: string;
    addMore: string;
    notAvailable: string;
    insufficientStock: string;
    maxStockInCart: string;
    onlyXAvailable: string;
    onlyXLeft: string;
    productReviews: string;
    technicalSpecs: string;
    hideWalletBalance: string;
    showWalletBalance: string;
    addedToCart: string;
    addedToCartDesc: string;
    welcome: string;
    registrationSuccessful: string;
    welcomeMessage: string;
    logoutSuccessful: string;
    logoutMessage: string;
    error: string;
    logoutError: string;
    loginSuccessful: string;
    loginWelcome: string;
    unit: string;
    units: string;
    
    // Filters & Sorting
    filters: string;
    searchProducts: string;
    searchProductsPlaceholder: string;
    sortBy: string;
    relevance: string;
    name: string;
    categories: string;
    priceRange: string;
    clearAllFilters: string;
    clearFilters: string;
    ascending: string;
    descending: string;
    highToLow: string;
    lowToHigh: string;
    aToZ: string;
    zToA: string;
    availability: string;
    inStockOnly: string;
    newest: string;
    showingProducts: string;
    page: string;
    of: string;
    product: string;
    products: string;
  };

  // Blog page
  blog: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    allTags: string;
    readMore: string;
    by: string;
    views: string;
    noPostsFound: string;
    noPostsMessage: string;
    loadingPosts: string;
    previousPage: string;
    nextPage: string;
    page: string;
    of: string;
  };

  // Blog post page
  blogPost: {
    loading: string;
    notFound: string;
    notFoundMessage: string;
    backToBlog: string;
    shareArticle: string;
    copyLink: string;
    linkCopied: string;
    linkCopiedMessage: string;
    tableOfContents: string;
    aboutAuthor: string;
    relatedPosts: string;
    noRelatedPosts: string;
    readingTime: string;
    minutes: string;
    publishedOn: string;
    updatedOn: string;
    previousPost: string;
    nextPost: string;
    tags: string;
    share: string;
  };

  // Checkout page
  checkout_page: {
    // Page titles & headers
    welcomeTitle: string;
    orderPlacedSuccess: string;
    orderFailed: string;
    orderFailedDesc: string;
    
    // Customer Information
    customerInfo: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber: string;
    company: string;
    required: string;
    
    // Address Fields
    billingAddress: string;
    shippingAddress: string;
    fullAddress: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    province: string;
    postalCode: string;
    country: string;
    selectProvince: string;
    selectCity: string;
    selectProvinceFirst: string;
    
    // Recipient Information
    recipientInfo: string;
    recipientName: string;
    recipientPhone: string;
    recipientMobile: string;
    recipientAddress: string;
    deliveryAddress: string;
    fullRecipientName: string;
    recipientMobilePlaceholder: string;
    fullDeliveryAddress: string;
    
    // Second Address
    secondAddress: string;
    secondDeliveryAddress: string;
    secondFullAddress: string;
    secondCity: string;
    secondProvince: string;
    secondPostalCode: string;
    mobileDeliveryRecipient: string;
    
    // Shipping & Delivery
    shippingMethod: string;
    selectShippingMethod: string;
    smartSelection: string;
    deliveryMethod: string;
    estimatedDelivery: string;
    shippingCost: string;
    shippingCostLabel: string;
    freeShipping: string;
    days: string;
    vehicleType: string;
    calculatingBestVehicle: string;
    smartSelectionDetails: string;
    selectedVehicleLabel: string;
    weightCapacity: string;
    volumeCapacity: string;
    allowedRoutesLabel: string;
    hazardousTransport: string;
    refrigeratedTransport: string;
    fragileHandling: string;
    freeShippingOver: string;
    moreForFreeShipping: string;
    cubicMeter: string;
    freightCollect: string;
    freightCollectDescription: string;
    freightCollectNote: string;
    freightCollectSelected: string;
    
    // Payment
    paymentInfo: string;
    paymentMethodTitle: string;
    selectPaymentMethod: string;
    selectPaymentPlaceholder: string;
    bankReceiptUpload: string;
    onlinePaymentMethod: string;
    walletPayment: string;
    walletPaymentTitle: string;
    useWallet: string;
    walletBalance: string;
    walletAmountToUse: string;
    amountToUse: string;
    maxAmount: string;
    maximum: string;
    amountFromWallet: string;
    remainingAmount: string;
    remainingBalance: string;
    availableFunds: string;
    orderFullyPaidByWallet: string;
    noAdditionalPaymentNeeded: string;
    secondaryPayment: string;
    selectSecondaryPayment: string;
    
    // Order Notes
    orderNotes: string;
    orderNotesOptional: string;
    orderNotesPlaceholder: string;
    specialInstructions: string;
    
    // Actions
    placeOrder: string;
    processingOrder: string;
    continueToPayment: string;
    backToShop: string;
    orderNumber: string;
    
    // Purchase Order Summary
    purchaseOrder: string;
    orderSummary: string;
    productList: string;
    subtotal: string;
    totalWeight: string;
    shipping: string;
    tax: string;
    discount: string;
    walletUsed: string;
    total: string;
    minimize: string;
    
    // Cart Management
    cartManagement: string;
    removeItem: string;
    updateQuantity: string;
    emptyCart: string;
    
    // Validation Messages
    validEmail: string;
    minCharacters: string;
    minTwoCharacters: string;
    validPhone: string;
    addressRequired: string;
    cityRequired: string;
    stateRequired: string;
    postalRequired: string;
    countryRequired: string;
    selectShipping: string;
    selectPayment: string;
    
    // Units & Measurements
    kg: string;
    ton: string;
    liter: string;
    piece: string;
    iqd: string;
    usd: string;
    
    // New translations for checkout.tsx
    deliveryTitle: string;
    useSecondaryAddress: string;
    secondaryAddressSelected: string;
    cityLabel: string;
    recipientInfoTitle: string;
    recipientInfoLabel: string;
    recipientInfoNote: string;
    recipientNameLabel: string;
    recipientNamePlaceholder: string;
    recipientPhoneLabel: string;
    recipientAddressLabel: string;
    recipientAddressPlaceholder: string;
    secondAddressOrMobile: string;
    secondAddressNote: string;
    secondAddressOptional: string;
    hideButton: string;
    addSecondAddress: string;
    secondFullAddressLabel: string;
    secondFullAddressPlaceholder: string;
    fullAddressLabel: string;
    secondAddressDeliveryPlaceholder: string;
    provinceLabel: string;
    selectProvincePlaceholder: string;
    citySelectLabel: string;
    selectCityPlaceholder: string;
    postalCodeLabel: string;
    postalCodePlaceholder: string;
    differentMobileOptional: string;
    differentMobileLabel: string;
    addDifferentNumber: string;
    recipientMobileLabel: string;
    thisNumberForDelivery: string;
    mobileForDeliveryContact: string;
    shippingMethodTitle: string;
    selectShippingLabel: string;
    selectShippingPlaceholder: string;
    smartSelectionNote: string;
    destination: string;
    weight: string;
    basePrice: string;
    distance: string;
    autoCalculate: string;
    specifyDestinationCity: string;
    addProductsToCart: string;
    erbilCity: string;
    heavyTruck: string;
    flammableSuffix: string;
    warehouseNoteActive: string;
    warehouseNoteSecond: string;
    warehouseNoteCRM: string;
    warehouseNotePhone: string;
    warehouseNoteDifferentMobile: string;
    warehouseNoteCRMPhone: string;
    orderCodeAfterCheckout: string;
    productCode: string;
    removeFromCart: string;
    removedFromCartMsg: string;
    defaultAddressInactive: string;
    defaultAddressCRM: string;
    provinceField: string;
    cityField: string;
    phoneField: string;
    unknown: string;
    secondAddressOrDifferentMobile: string;
    
    // Order Summary Section
    orderSummaryTitle: string;
    itemCount: string;
    approximateWeight: string;
    defaultDeliveryAddress: string;
    activeDeliveryInfo: string;
    draggableCardMessage: string;
    smartVehicleSelectionLabel: string;
    
    // Draggable Card
    dragging: string;
    draggable: string;
    dragToMove: string;
    
    // Order Details
    orderContainsItems: string;
    items: string;
    orderDate: string;
    
    // Vehicle Selection
    vehicleTypeLabel: string;
    weightCapacityLabel: string;
    destinationLabel: string;
    baseCostLabel: string;
    distanceFromErbil: string;
    kilometer: string;
    autoCalculation: string;
    
    // Active Address Info
    activeAddress: string;
    recipientPhoneNumber: string;
    infoWillBeUsed: string;
    addressNotUsed: string;
    defaultAddressNote: string;
    
    // Form Labels
    secondAddressTitle: string;
    differentMobileNumberLabel: string;
    
    // Actions
    continueShoppingBtn: string;
    clearCartBtn: string;
    cartClearedTitle: string;
    allProductsRemoved: string;
    
    // Payment Summary
    paymentSummaryTitle: string;
    itemsTotal: string;
    shippingCostSummary: string;
    free: string;
    valueAddedTax: string;
    valueAddedDuty: string;
    walletUsedSummary: string;
    totalPayable: string;
    freeShippingEligible: string;
    fullyPaidByWallet: string;
  };

  // Address Selector Component
  address_selector: {
    // Page titles
    deliveryAddressTitle: string;
    selectAddressDescription: string;
    
    // Buttons
    addNewAddress: string;
    addFirstAddress: string;
    updateButton: string;
    cancelButton: string;
    setAsDefault: string;
    getLocationButton: string;
    gettingLocation: string;
    
    // Dialog titles
    editAddressTitle: string;
    addAddressTitle: string;
    enterAddressInfo: string;
    
    // Form labels
    addressTitle: string;
    addressTitlePlaceholder: string;
    recipientNameLabel: string;
    recipientNamePlaceholder: string;
    recipientNameNote: string;
    fullAddressLabel: string;
    fullAddressPlaceholder: string;
    cityLabel: string;
    postalCodeLabel: string;
    postalCodePlaceholder: string;
    gpsLocationLabel: string;
    latitudeLabel: string;
    longitudeLabel: string;
    accuracyLabel: string;
    metersUnit: string;
    
    // Status messages
    defaultBadge: string;
    recipientLabel: string;
    noAddressFound: string;
    loadingAddresses: string;
    
    // Toast messages
    locationReceived: string;
    locationReceivedDesc: string;
    locationError: string;
    locationPermissionDenied: string;
    locationUnavailable: string;
    locationTimeout: string;
    browserNotSupported: string;
    addressCreated: string;
    addressCreateError: string;
    addressUpdated: string;
    addressUpdateError: string;
    addressDeleted: string;
    addressDeleteError: string;
    defaultAddressSet: string;
    defaultAddressError: string;
    fetchAddressesError: string;
    fetchCustomerInfoError: string;
    
    // Countries
    defaultCountry: string;
  };
  
  // Common actions
  login: string;
  logout: string;
  register: string;
  submit: string;
  cancel: string;
  save: string;
  edit: string;
  delete: string;
  search: string;
  loading: string;
  
  // Product related
  addToCart: string;
  viewDetails: string;
  price: string;
  quantity: string;
  category: string;
  inStock: string;
  outOfStock: string;
  
  // Cart and checkout
  cart: string;
  checkout: string;
  total: string;
  subtotal: string;
  shipping: string;
  orderSummary: string;
  placeOrder: string;
  
  // User account
  myAccount: string;
  myOrders: string;
  profile: string;
  wallet: string;
  orderHistory: string;
  
  // Batch Management
  batchManagement: {
    pageTitle: string;
    pageSubtitle: string;
    searchBatches: string;
    searchDescription: string;
    barcodeLabel: string;
    barcodePlaceholder: string;
    searchButton: string;
    currentSellingBatch: string;
    currentSellingDescription: string;
    batchNumber: string;
    stock: string;
    stockUnits: string;
    productionDate: string;
    activeStatus: string;
    totalBatches: string;
    totalStock: string;
    barcode: string;
    emptyBatches: string;
    batchList: string;
    batchListDescription: string;
    soldOut: string;
    selling: string;
    waiting: string;
    price: string;
    netWeight: string;
    batchNotFound: string;
    noBatchesMessage: string;
    loadingBatches: string;
  };
  
  // Wallet specific
  walletTitle: string;
  walletSubtitle: string;
  currentBalance: string;
  creditLimit: string;
  status: string;
  lastActivity: string;
  addFunds: string;
  transactions: string;
  rechargeRequests: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  paymentReference: string;
  notes: string;
  pending: string;
  completed: string;
  rejected: string;
  active: string;
  inactive: string;
  credit: string;
  debit: string;
  type: string;
  description: string;
  date: string;
  requestNumber: string;
  totalSpent: string;
  totalRecharged: string;
  noTransactions: string;
  noRechargeRequests: string;
  rechargeSuccess: string;
  optional: string;
  bankTransfer: string;
  onlinePayment: string;
  cashPayment: string;
  mobileWallet: string;
  processing: string;
  allTransactions: string;
  recentTransactions: string;
  quickActions: string;
  manageWallet: string;
  walletRechargeRequest: string;
  fillRechargeDetails: string;
  enterAmount: string;
  selectPaymentMethod: string;
  iraqiDinar: string;
  usDollar: string;
  euro: string;
  enterPaymentReference: string;
  enterNotes: string;
  inputError: string;
  validAmount: string;
  requestError: string;
  errorCreatingRequest: string;
  loginToAccessWallet: string;
  goToLogin: string;
  totalWithdrawals: string;
  totalDeposits: string;
  requestSubmitted: string;
  requestPendingApproval: string;
  
  // Wallet Management (Admin)
  walletHolders: string;
  walletManagement: string;
  changeAmount: string;
  reason: string;
  apply: string;
  modifyBalance: string;
  addSubtractAmount: string;
  reasonForChange: string;
  allWalletHolders: string;
  noWalletsFound: string;
  syncWallet: string;
  
  // Customer Profile
  welcomeCustomer: string;
  customerProfile: string;
  manageAccount: string;
  editProfile: string;
  continueShopping: string;
  accountInformation: string;
  fullName: string;
  contactDetails: string;
  orderNumber: string;
  totalAmount: string;
  noOrders: string;
  viewOrder: string;
  orderDate: string;
  orderStatus: string;
  confirmed: string;
  shipped: string;
  delivered: string;
  cancelled: string;
  logoutSuccessful: string;
  logoutSuccessfulDesc: string;
  logoutError: string;
  error: string;
  
  // Forms
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  company: string;
  
  // Messages
  welcomeMessage: string;
  thankYou: string;
  orderConfirmed: string;
  contactSuccess: string;
  
  // Notifications and Toast Messages
  success: string;
  errorOccurred: string;
  warning: string;
  info: string;
  loginSuccessful: string;
  loginFailed: string;
  registrationSuccessful: string;
  registrationFailed: string;
  orderCreated: string;
  orderFailed: string;
  addedToCart: string;
  removedFromCart: string;
  cartCleared: string;
  profileUpdated: string;
  profileUpdateFailed: string;
  passwordChanged: string;
  passwordChangeFailed: string;
  emailSent: string;
  emailFailed: string;
  dataLoaded: string;
  dataLoadFailed: string;
  unauthorized: string;
  unauthorizedDesc: string;
  productNotFound: string;
  networkError: string;
  tryAgain: string;
  pleaseWait: string;
  
  // Product categories
  waterTreatment: string;
  fuelAdditives: string;
  paintThinner: string;
  agriculturalFertilizers: string;
  paintSolvents: string;
  industrialChemicals: string;
  technicalEquipment: string;
  commercialGoods: string;
  
  // Product category descriptions
  fuelAdditivesDesc: string;
  waterTreatmentDesc: string;
  paintSolventsDesc: string;
  agriculturalFertilizersDesc: string;
  industrialChemicalsDesc: string;
  paintThinnerDesc: string;
  technicalEquipmentDesc: string;
  commercialGoodsDesc: string;
  
  // Product Reviews
  productReviews: string;
  customerReviews: string;
  addYourReview: string;
  writeReview: string;
  rating: string;
  comment: string;
  customerName: string;
  submitReview: string;
  reviewSubmitted: string;
  reviewSubmittedDesc: string;
  reviewError: string;
  reviewErrorDesc: string;
  backToShop: string;
  averageRating: string;
  totalReviews: string;
  noReviewsYet: string;
  noReviewsDesc: string;
  reviewsAndRatings: string;
  customerFeedback: string;
  productReviewsFor: string;
  totalReviewsCount: string;
  loginToReview: string;
  loginToReviewDesc: string;
  reviewingAs: string;
  yourPreviousReview: string;
  editReview: string;
  postedOn: string;
  editYourReview: string;
  updateReview: string;
  beFirstToReview: string;
  you: string;
  reviewUpdated: string;
  reviewUpdatedDesc: string;
  review: string;
  reviews: string;
  
  // Footer
  aboutCompany: string;
  contactInfo: string;
  followUs: string;
  allRightsReserved: string;
  
  // Bank Receipt
  uploadBankReceipt: string;
  bankReceiptRequired: string;
  bankReferenceRequired: string;
  
  // Home Page - Hero Section
  advancedChemical: string;
  solutions: string;
  forIndustry: string;
  heroDescription: string;
  exploreProducts: string;
  contactSales: string;
  callForPrice: string;
  
  // Home Page
  ourProductPortfolio: string;
  productPortfolioDesc: string;
  products_plural: string;
  availableProducts: string;
  moreProducts: string;
  viewAll: string;
  aboutMomtazchem: string;
  aboutMomtazchemDesc1: string;
  aboutMomtazchemDesc2: string;
  qualityExcellence: string;
  qualityExcellenceDesc: string;
  sustainability: string;
  sustainabilityDesc: string;
  learnMoreAboutUs: string;
  customerSatisfaction: string;
  ourServicesCapabilities: string;
  servicesCapabilitiesDesc: string;
  rdServices: string;
  rdServicesDesc: string;
  customFormulations: string;
  productTesting: string;
  performanceAnalysis: string;
  globalDistribution: string;
  globalDistributionDesc: string;
  countries40Plus: string;
  expressShipping: string;
  bulkOrders: string;
  technicalSupport: string;
  technicalSupportDesc: string;
  support24_7: string;
  applicationTraining: string;
  documentation: string;
  
  // About page
  aboutTitle: string;
  aboutSubtitle: string;
  ourStory: string;
  ourMission: string;
  ourVision: string;
  ourCoreValues: string;
  valuesSubtitle: string;
  ourTeamExpertise: string;
  certificationsCompliance: string;
  certificationsSubtitle: string;
  
  // About content
  storyParagraph1: string;
  storyParagraph2: string;
  storyParagraph3: string;
  missionText: string;
  visionText: string;
  teamText: string;
  
  // Values (same as in Home Page)
  environmentalResponsibility: string;
  environmentalResponsibilityDesc: string;
  customerFocus: string;
  customerFocusDesc: string;
  globalReach: string;
  globalReachDesc: string;
  
  // Stats
  employees: string;
  rdScientists: string;
  manufacturingSites: string;
  qualityRate: string;
  
  // Certifications
  iso9001: string;
  iso9001Desc: string;
  iso14001: string;
  iso14001Desc: string;
  ohsas18001: string;
  ohsas18001Desc: string;
  reachCompliance: string;
  reachComplianceDesc: string;
  
  // Product Form
  productManagement: {
    categoryRequired: string;
    barcodeRequired: string;
    unitPriceRequired: string;
    stockRequired: string;
    minStockRequired: string;
    maxStockRequired: string;
    netWeightRequired: string;
    grossWeightRequired: string;
    grossWeightMinError: string;
    minMaxStockError: string;
    newBatchNumberRequired: string;
    batchDeleted: string;
    batchDeletedDesc: string;
    batchDeleteError: string;
    batchDeleteErrorDesc: string;
    productUpdated: string;
    productUpdateError: string;
    duplicateSKU: string;
    productDeleted: string;
    productDeleteError: string;
    enterNameCategory: string;
    imageUploaded: string;
    imageUploadError: string;
    barcodeGenerated: string;
    barcodeGeneratedDesc: string;
    confirmBatchDelete: string;
    editProduct: string;
    addNewProduct: string;
    nonChemicalProduct: string;
    nonChemicalDesc: string;
    flammableProduct: string;
    flammableDesc: string;
    baseInfo: string;
    productName: string;
    productNamePlaceholder: string;
    productNameHelp: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    categoryHelp: string;
    technicalName: string;
    technicalNamePlaceholder: string;
    technicalNameHelp: string;
    description: string;
    descriptionPlaceholder: string;
    descriptionHelp: string;
    identificationPricing: string;
    sku: string;
    skuPlaceholder: string;
    skuPlaceholderView: string;
    skuHelp: string;
    skuHelpView: string;
    barcode: string;
    barcodePlaceholder: string;
    barcodeHelp: string;
    unitPrice: string;
    unitPricePlaceholder: string;
    unitPriceHelp: string;
    stock: string;
    stockPlaceholder: string;
    stockPlaceholderEdit: string;
    stockHelp: string;
    inventoryAddition: string;
    inventoryAdditionPlaceholder: string;
    batchSelection: string;
    batchSelectionPlaceholder: string;
    batchOption: string;
    addNewBatch: string;
    batchesAvailable: string;
    selectNewBatch: string;
    currentBatchNumber: string;
    newBatchNumber: string;
    batchNumberPlaceholder: string;
    batchNumberHelp: string;
    batchNumberHelpCurrent: string;
    stockWillBeAdded: string;
    minStock: string;
    minStockPlaceholder: string;
    minStockHelp: string;
    maxStock: string;
    maxStockPlaceholder: string;
    maxStockHelp: string;
    weightRow: string;
    netWeight: string;
    netWeightPlaceholder: string;
    netWeightHelp: string;
    netWeightHelpView: string;
    grossWeight: string;
    grossWeightPlaceholder: string;
    grossWeightHelp: string;
    grossWeightHelpView: string;
    weightUnit: string;
    syncWithShop: string;
    showWhenOutOfStock: string;
    productImages: string;
    productImagesFromMain: string;
    imagesHelp: string;
    imagesHelpBatch: string;
    selectPrimaryImage: string;
    selectPrimaryImageHelp: string;
    selectPrimaryImageHelpDB: string;
    imageNumber: string;
    imagePreview: string;
    setPrimaryImage: string;
    selectImage: string;
    imageUrlPlaceholder: string;
    productCatalog: string;
    catalogHelp: string;
    catalogFile: string;
    selectCatalog: string;
    catalogName: string;
    catalogNamePlaceholder: string;
    showToCustomers: string;
    catalogURL: string;
    catalogURLPlaceholder: string;
    msds: string;
    msdsHelp: string;
    msdsFile: string;
    selectMSDS: string;
    msdsName: string;
    msdsNamePlaceholder: string;
    msdsURL: string;
    msdsURLPlaceholder: string;
    updateProduct: string;
    addProduct: string;
    confirmDelete: string;
    confirmDeleteDesc: string;
    confirmDeleteWarning: string;
    cancel: string;
    deleteProduct: string;
    activeBatch: string;
    fifoSystem: string;
    totalStock: string;
    onlyBatchesWithStock: string;
    deleteBatch: string;
    netWeightLabel: string;
    grossWeightLabel: string;
    weightLabel: string;
    
    // Additional UI elements (must match the ones added in translations)
    hideFromShop: string;
    showInShop: string;
    manageBatches: string;
    sellingNow: string;
    inQueue: string;
    clickToOpenCatalog: string;
    clickToOpenMSDS: string;
    manualMode: string;
    currencyIQD: string;
    currencyUSD: string;
    currencyEUR: string;
    currencyTRY: string;
    currentStock: string;
    addStock: string;
    onlyForEdit: string;
    editOnly: string;
    editOnlyPlaceholder: string;
    fileManagement: string;
    uploadingFile: string;
    viewCatalog: string;
    uploadCatalog: string;
    viewMSDS: string;
    uploadMSDS: string;
    imageUrlsLabel: string;
    primaryImageLabel: string;
    productImagesMain: string;
    editableIfNeeded: string;
    imagesFetchedFromMain: string;
    imagesFetchedHelp: string;
    imagesFetchedFromDB: string;
    clickCircleButton: string;
    uploadImage: string;
    clickToSelectPDF: string;
    onlyPDF: string;
    incompleteInfo: string;
    enterNameCategoryFirst: string;
    standard13Barcode: string;
    manualInputPreventsAuto: string;
    barcode13Placeholder: string;
    pricePerUnit: string;
    stockManagement: string;
    stockRow: string;
    stockNotEditable: string;
    initialStockHelp: string;
    stockAdditionHelp: string;
    chemical: string;
    allBatches: string;
    unit: string;
    units: string;
    editable: string;
    imagesUploadSection: string;
    selectPrimaryImageTitle: string;
    imageFromMain: string;
    maxThreeImages: string;
    catalogActionsButtons: string;
    msdsSection: string;
    msdsActionsButtons: string;
    msdsSettings: string;
    catalogSettings: string;
    showToCustomersLabel: string;
    showToCustomersHelp: string;
    hidden: string;
    forChemicalOnly: string;
    newBatchField: string;
    selectBatchForEdit: string;
    selectBatchPlaceholderText: string;
    allBatchesCount: string;
    totalStockLabel: string;
    onlyWithStock: string;
    batch: string;
    batchNum: string;
    initialFixedValue: string;
    fixedValue: string;
    selectWeightUnit: string;
    weightUnitKg: string;
    weightUnitG: string;
    weightUnitLb: string;
    weightUnitOz: string;
    weightUnitT: string;
    tagsLabel: string;
    tagsHelp: string;
    tagsPlaceholder: string;
    showWhenOutOfStockDesc: string;
    clickToSelectCatalog: string;
    clickToSelectMSDS: string;
    catalogDownloadable: string;
    msdsDownloadable: string;
    inStock: string;
    lowStock: string;
    outOfStock: string;
    activeFilters: string;
    statusLabel: string;
    visibilityLabel: string;
    hiddenProducts: string;
    visibleProducts: string;
    searchLabel: string;
    clearAll: string;
    totalProducts: string;
    fileTooLarge: string;
    fileTooLargeDesc: string;
    invalidFormat: string;
    invalidImageFormat: string;
    invalidPDFFormat: string;
    uploadError: string;
    uploadFailed: string;
    success: string;
    imageUploadedSuccess: string;
    technicalSpecifications: string;
    technicalSpecificationsPlaceholder: string;
    technicalSpecificationsHelp: string;
    productFeatures: string;
    productFeaturesPlaceholder: string;
    productFeaturesHelp: string;
    productApplications: string;
    productApplicationsPlaceholder: string;
    productApplicationsHelp: string;
    batchInfoNotAvailable: string;
    displayMode: string;
    displayModeHelp: string;
    displayModeImages: string;
    displayMode3D: string;
    model3dFile: string;
    uploadModel3d: string;
    viewModel3d: string;
    deleteModel3d: string;
    model3dHelp: string;
    model3dFormats: string;
    model3dUploaded: string;
    model3dDeleted: string;
    invalidModel3dFormat: string;
    model3dTooLarge: string;
    rotate3dModel: string;
    zoom3dModel: string;
    loading3dModel: string;
    error3dModel: string;
    pageTitle: string;
    pageSubtitle: string;
    backToAdmin: string;
    logout: string;
    searchPlaceholder: string;
    allProducts: string;
    noProductsFound: string;
    noProductsAvailable: string;
    noProductsMatch: string;
    addFirstProduct: string;
    clearSearch: string;
    discontinued: string;
    unknown: string;
    noBarcode: string;
    variant: string;
    companyLabel: string;
    temperatureLabel: string;
    temperatureNone: string;
    temperatureFrozen: string;
    temperatureChilled: string;
    temperatureCool: string;
    temperatureDry: string;
    assignVendor: string;
    assignVendorHelp: string;
    selectVendor: string;
    noVendor: string;
    fileTooLargeTitle: string;
    imageTooLargeDesc: string;
    invalidImageFormatDesc: string;
    imageUploadSuccess: string;
    uploadErrorTitle: string;
    imageUploadFailed: string;
    invalidImageFormatsDesc: string;
    removeImageError: string;
    imageFileTypes: string;
    model3dFileTypes: string;
    removeCatalogError: string;
    removeMsdsError: string;
    catalogFilename: string;
    msdsFilename: string;
    selected: string;
    model3dPreview: string;
    aiGenerate: string;
  };
  
  // Auth & Login
  auth: {
    login: string;
    register: string;
    password: string;
    confirmPassword: string;
    forgotPassword: string;
    loggingIn: string;
    registering: string;
    welcome: string;
    or: string;
    continueWithGoogle: string;
    continueWithFacebook: string;
    loginSuccess: string;
    invalidCredentials: string;
    loginError: string;
    serverError: string;
    networkError: string;
    networkErrorDesc: string;
    enterEmail: string;
    enterPassword: string;
    switchToLogin: string;
    customerLogin: string;
    signInOrRegister: string;
    verifyMobileNumber: string;
    verificationCodeDescription: string;
    smsVerification: string;
    verificationCodeSent: string;
    codeSentTo: string;
    enterVerificationCode: string;
    enterCodePlaceholder: string;
    enter4DigitCode: string;
    fourDigitCode: string;
    sixDigitCode: string;
    verifying: string;
    verifyCode: string;
    verifyCodes: string;
    resend: string;
    back: string;
    basicInformation: string;
    contactInformation: string;
    addressInformation: string;
    additionalInformation: string;
    mobileNumber: string;
    whatsappNumber: string;
    whatsappDefault: string;
    whatsappOptional: string;
    leaveEmptyIfSame: string;
    alternatePhone: string;
    province: string;
    selectProvince: string;
    selectCity: string;
    selectCountry: string;
    fullAddress: string;
    secondaryAddress: string;
    postalCode: string;
    industry: string;
    businessType: string;
    companySize: string;
    manufacturer: string;
    distributor: string;
    retailer: string;
    endUser: string;
    small: string;
    medium: string;
    large: string;
    enterprise: string;
    communicationPreference: string;
    preferredLanguage: string;
    english: string;
    arabic: string;
    persian: string;
    marketingConsent: string;
    requiredField: string;
    verificationCodesSent: string;
    verificationCodesError: string;
    registrationSuccessful: string;
    accountCreated: string;
    registrationError: string;
    invalidCodes: string;
    verificationError: string;
    smsCodeLabel: string;
    emailCodeLabel: string;
    sentTo: string;
    and: string;
    verify: string;
    emailAlreadyRegistered: string;
    emailAlreadyRegisteredDesc: string;
    emailAlreadyRegisteredMessage: string;
    creatingAccount: string;
    createAccount: string;
    dualVerification: string;
    verificationCodesSentTo: string;
    profileUpdated: string;
    profileUpdatedDesc: string;
    updateError: string;
    updateFailed: string;
    registrationVerificationSent: string;
    verificationSentDesc: string;
    validation: {
      invalidEmail: string;
      passwordMin6: string;
      firstNameMin2: string;
      lastNameMin2: string;
      phoneMin10: string;
      countryRequired: string;
      provinceRequired: string;
      cityRequired: string;
      addressMin5: string;
      passwordsMustMatch: string;
    };
  };
  
  addProduct: string;
  editProduct: string;
  productName: string;
  shortDescription: string;
  productDescription: string;
  priceRange: string;
  productCategory: string;
  productSpecifications: string;
  productFeatures: string;
  bankReference: string;
  requestRecharge: string;
  enterBankReference: string;
  rechargeAmount: string;
  bankReceipt: string;
  rechargeHistory: string;
  productApplications: string;
  productTags: string;
  productImage: string;
  productCatalog: string;
  msdsDocument: string;
  stockQuantity: string;
  minStockLevel: string;
  maxStockLevel: string;
  unitPrice: string;
  netWeight: string;
  grossWeight: string;
  weightUnit: string;
  batchNumber: string;
  productSku: string;
  productBarcode: string;
  isVariant: string;
  parentProduct: string;
  variantType: string;
  variantValue: string;
  syncWithShop: string;
  showWhenOutOfStock: string;
  showCatalogToCustomers: string;
  showMsdsToCustomers: string;
  basicInfo: string;
  pricingInventory: string;
  documentsMedia: string;
  variantSettings: string;
  shopSettings: string;
  weightsAndBatch: string;
  productDetails: string;
  loadingReviews: string;
  customerReviewTitle: string;
  
  // Contact Page
  contactPage: {
    // Form Labels
    firstName: string;
    lastName: string;
    emailAddress: string;
    company: string;
    productInterest: string;
    message: string;
    
    // Form Placeholders
    firstNamePlaceholder: string;
    lastNamePlaceholder: string;
    emailPlaceholder: string;
    companyPlaceholder: string;
    productInterestPlaceholder: string;
    messagePlaceholder: string;
    
    // Product Categories
    waterTreatment: string;
    fuelAdditives: string;
    paintThinner: string;
    agriculturalFertilizers: string;
    industrialChemicals: string;
    technicalEquipment: string;
    commercialGoods: string;
    customSolutions: string;
    
    // Buttons
    sending: string;
    sendMessage: string;
    
    // Toast Messages
    messageSent: string;
    messageSentDesc: string;
    errorTitle: string;
    errorDesc: string;
    
    // Sections
    contactInformation: string;
    ourCertifications: string;
    findUs: string;
    visitHeadquarters: string;
    getDirections: string;
    viewInMaps: string;
  };
  
  // Services Page
  servicesPage: {
    title: string;
    subtitle: string;
    
    // Service 1: R&D
    rdTitle: string;
    rdDesc: string;
    rdFeature1: string;
    rdFeature2: string;
    rdFeature3: string;
    rdFeature4: string;
    rdFeature5: string;
    rdFeature6: string;
    
    // Service 2: Distribution
    distributionTitle: string;
    distributionDesc: string;
    distFeature1: string;
    distFeature2: string;
    distFeature3: string;
    distFeature4: string;
    distFeature5: string;
    distFeature6: string;
    
    // Service 3: Technical Support
    techSupportTitle: string;
    techSupportDesc: string;
    techFeature1: string;
    techFeature2: string;
    techFeature3: string;
    techFeature4: string;
    techFeature5: string;
    techFeature6: string;
    
    // Service 4: Consulting
    consultingTitle: string;
    consultingDesc: string;
    consultFeature1: string;
    consultFeature2: string;
    consultFeature3: string;
    consultFeature4: string;
    consultFeature5: string;
    consultFeature6: string;
    
    // Service 5: Quality Assurance
    qaTitle: string;
    qaDesc: string;
    qaFeature1: string;
    qaFeature2: string;
    qaFeature3: string;
    qaFeature4: string;
    qaFeature5: string;
    qaFeature6: string;
    
    // Service 6: Custom Manufacturing
    customMfgTitle: string;
    customMfgDesc: string;
    customFeature1: string;
    customFeature2: string;
    customFeature3: string;
    customFeature4: string;
    customFeature5: string;
    customFeature6: string;
    
    // Capabilities
    coreCapabilities: string;
    coreCapabilitiesDesc: string;
    advManufacturing: string;
    advManufacturingDesc: string;
    qualityControl: string;
    qualityControlDesc: string;
    globalReachCap: string;
    globalReachCapDesc: string;
    expertTeam: string;
    expertTeamDesc: string;
    
    // Service Process
    serviceProcess: string;
    serviceProcessDesc: string;
    consultation: string;
    consultationDesc: string;
    development: string;
    developmentDesc: string;
    testing: string;
    testingDesc: string;
    delivery: string;
    deliveryDesc: string;
    
    // CTA
    readyToStart: string;
    contactExpertsDesc: string;
    contactSales: string;
    requestQuote: string;
    
    // Contact Form
    contactSalesTitle: string;
    fullName: string;
    emailAddress: string;
    companyName: string;
    phoneNumber: string;
    message: string;
    messagePlaceholder: string;
    cancel: string;
    sendMessage: string;
    sending: string;
    
    // Quote Form  
    requestQuoteTitle: string;
    productCategory: string;
    productCategoryPlaceholder: string;
    requiredQuantity: string;
    quantityPlaceholder: string;
    requiredTimeline: string;
    timelinePlaceholder: string;
    productSpecs: string;
    specsPlaceholder: string;
    additionalReqs: string;
    additionalPlaceholder: string;
    submitQuote: string;
    submitting: string;
    
    // Toast Messages
    messageSent: string;
    messageSentDesc: string;
    quoteSubmitted: string;
    quoteSubmittedDesc: string;
    errorTitle: string;
    messageFailed: string;
    quoteFailed: string;
  };
}

const baseTranslations = {
  
  en: {
    // Navigation
    home: 'Home',
    about: 'About',
    services: 'Services',
    products: 'Products',
    contact: 'Contact',
    shop: {
      title: 'Shop',
      lowStockWarning: 'Only {count} items left!',
      priceFilter: 'Price Filter',
      minPrice: 'Min',
      maxPrice: 'Max',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      volumeDeals: 'Volume Deals',
      active: 'ACTIVE',
      off: 'OFF',
      more: 'more',
      items: 'items',
      max: 'MAX',
      buy: 'Buy',
      catalog: 'Catalog',
      addToCart: 'Add to Cart',
      addMore: 'Add More',
      notAvailable: 'Not Available',
      insufficientStock: 'Insufficient Stock',
      maxStockInCart: 'Maximum stock of this product is in cart',
      onlyXAvailable: 'Only {count} units of this product available',
      onlyXLeft: 'Only {count} left!',
      productReviews: 'Product Reviews & Rating',
      technicalSpecs: 'Technical Specifications',
      hideWalletBalance: 'Hide Wallet Balance',
      showWalletBalance: 'Show Wallet Balance',
      addedToCart: 'Added to Cart',
      addedToCartDesc: '{count} units of {product} added to cart',
      welcome: 'Welcome',
      registrationSuccessful: 'Registration Successful',
      welcomeMessage: 'Welcome {name}',
      logoutSuccessful: 'Logout Successful',
      logoutMessage: 'You have successfully logged out',
      error: 'Error',
      logoutError: 'Error logging out',
      loginSuccessful: 'Login Successful',
      loginWelcome: 'Welcome back! You can now checkout',
      unit: 'unit',
      units: 'units',
      
      // Filters & Sorting
      filters: 'Filters',
      searchProducts: 'Search Products',
      searchProductsPlaceholder: '...Search products',
      sortBy: 'Sort by',
      relevance: 'Relevance',
      name: 'Name',
      categories: 'Categories',
      priceRange: 'Price Range',
      clearAllFilters: 'Clear All Filters',
      clearFilters: 'Clear all filters',
      ascending: 'Ascending',
      descending: 'Descending',
      highToLow: 'High to Low',
      lowToHigh: 'Low to High',
      aToZ: 'A-Z',
      zToA: 'Z-A',
      availability: 'Availability',
      inStockOnly: 'In Stock Only',
      newest: 'Newest',
      showingProducts: 'Showing',
      page: 'page',
      of: 'of',
      product: 'product',
      products: 'products',
    },

    // Blog page
    blog: {
      title: 'Blog - Chemical Industry Insights',
      subtitle: 'Latest articles, guides, and insights about chemical solutions, fuel additives, water treatment, and industrial chemicals',
      searchPlaceholder: 'Search articles by title or content...',
      allTags: 'All Tags',
      readMore: 'Read More',
      by: 'By',
      views: 'views',
      noPostsFound: 'No Posts Found',
      noPostsMessage: 'We couldn\'t find any blog posts matching your criteria. Try adjusting your search or filters.',
      loadingPosts: 'Loading posts...',
      previousPage: 'Previous',
      nextPage: 'Next',
      page: 'Page',
      of: 'of',
    },

    // Blog post page
    blogPost: {
      loading: 'Loading article...',
      notFound: 'Article Not Found',
      notFoundMessage: 'The article you are looking for does not exist or has been removed.',
      backToBlog: 'Back to Blog',
      shareArticle: 'Share Article',
      copyLink: 'Copy Link',
      linkCopied: 'Link Copied!',
      linkCopiedMessage: 'The article link has been copied to your clipboard.',
      tableOfContents: 'Table of Contents',
      aboutAuthor: 'About the Author',
      relatedPosts: 'Related Articles',
      noRelatedPosts: 'No related articles found.',
      readingTime: 'Reading Time',
      minutes: 'min read',
      publishedOn: 'Published on',
      updatedOn: 'Updated on',
      previousPost: 'Previous Article',
      nextPost: 'Next Article',
      tags: 'Tags',
      share: 'Share',
    },

    // Checkout page
    checkout_page: {
      // Page titles & headers
      welcomeTitle: 'Welcome to Checkout',
      orderPlacedSuccess: 'Order Placed Successfully!',
      orderFailed: 'Order Failed',
      orderFailedDesc: 'There was an error processing your order. Please try again.',
      
      // Customer Information
      customerInfo: 'Customer Information',
      firstName: 'First Name',
      lastName: 'Last Name',
      emailAddress: 'Email Address',
      phoneNumber: 'Phone Number',
      company: 'Company',
      required: '*',
      
      // Address Fields
      billingAddress: 'Billing Address',
      shippingAddress: 'Shipping Address',
      fullAddress: 'Full Address',
      addressLine1: 'Address Line 1',
      addressLine2: 'Address Line 2',
      city: 'City',
      state: 'State/Province',
      province: 'Province',
      postalCode: 'Postal Code',
      country: 'Country',
      selectProvince: 'Select Province',
      selectCity: 'Select City',
      selectProvinceFirst: 'Select Province First',
      
      // Recipient Information
      recipientInfo: 'Recipient Information',
      recipientName: 'Recipient Name',
      recipientPhone: 'Recipient Phone',
      recipientMobile: 'Recipient Mobile',
      recipientAddress: 'Recipient Address',
      deliveryAddress: 'Delivery Address',
      fullRecipientName: 'Full Recipient Name',
      recipientMobilePlaceholder: '09123456789',
      fullDeliveryAddress: 'Full Delivery Address',
      
      // Second Address
      secondAddress: 'Second Address',
      secondDeliveryAddress: 'Second Delivery Address',
      secondFullAddress: 'Second Full Address',
      secondCity: 'Second City',
      secondProvince: 'Second Province',
      secondPostalCode: 'Second Postal Code',
      mobileDeliveryRecipient: 'Mobile Delivery Recipient',
      
      // Shipping & Delivery
      shippingMethod: 'Shipping Method',
      selectShippingMethod: 'Select Shipping Method',
      smartSelection: 'Smart Selection',
      deliveryMethod: 'Delivery Method',
      estimatedDelivery: 'Estimated Delivery',
      shippingCost: 'Shipping Cost',
      shippingCostLabel: 'Shipping Cost:',
      freeShipping: 'Free',
      days: 'days',
      vehicleType: 'Vehicle Type',
      calculatingBestVehicle: '🔄 Calculating best vehicle...',
      smartSelectionDetails: '📋 Smart Selection Details:',
      selectedVehicleLabel: '🚛 Selected Vehicle:',
      weightCapacity: '⚖️ Weight Capacity:',
      volumeCapacity: '📦 Volume Capacity:',
      allowedRoutesLabel: '🛣️ Allowed Routes:',
      hazardousTransport: '⚠️ Hazardous Materials Transport',
      refrigeratedTransport: '❄️ Refrigerated Transport',
      fragileHandling: '📱 Suitable for Fragile Items',
      freeShippingOver: '✓ Free shipping for purchases over',
      moreForFreeShipping: 'more for free shipping',
      cubicMeter: 'cubic meters',
      freightCollect: 'Freight Collect',
      freightCollectDescription: 'Shipping cost will be paid upon delivery by the customer',
      freightCollectNote: 'No shipping cost charged now - pay upon delivery',
      freightCollectSelected: 'Freight Collect - Pay shipping upon delivery',
      
      // Payment
      paymentInfo: 'Payment Information',
      paymentMethodTitle: 'Payment Method',
      selectPaymentMethod: 'Select Payment Method *',
      selectPaymentPlaceholder: 'Select payment method',
      bankReceiptUpload: 'Bank Receipt Upload',
      onlinePaymentMethod: 'Online Payment',
      walletPayment: 'Wallet Payment',
      walletPaymentTitle: 'Wallet Balance',
      useWallet: 'Use Wallet',
      walletBalance: 'Balance:',
      walletAmountToUse: 'Amount to Use from Wallet (IQD)',
      amountToUse: 'Amount to Use',
      maxAmount: 'Max',
      maximum: 'Maximum',
      amountFromWallet: 'Amount from Wallet:',
      remainingAmount: 'Remaining Amount:',
      remainingBalance: 'Remaining Balance',
      availableFunds: 'available',
      orderFullyPaidByWallet: '✓ Order will be fully paid by wallet - no additional payment needed',
      noAdditionalPaymentNeeded: 'no additional payment needed',
      secondaryPayment: 'Secondary Payment Method',
      selectSecondaryPayment: 'Select Secondary Payment Method',
      
      // Order Notes
      orderNotes: 'Order Notes',
      orderNotesOptional: 'Order Notes (Optional)',
      orderNotesPlaceholder: 'Special delivery instructions or additional information...',
      specialInstructions: 'Special Instructions',
      
      // Actions
      placeOrder: 'Place Order',
      processingOrder: 'Processing Order...',
      continueToPayment: 'Continue to Payment',
      backToShop: 'Back to Shop',
      orderNumber: 'Order Number',
      
      // Purchase Order Summary
      purchaseOrder: 'Purchase Order',
      orderSummary: 'Order Summary',
      productList: 'Product List',
      subtotal: 'Subtotal',
      totalWeight: 'Total Weight',
      shipping: 'Shipping',
      tax: 'Tax',
      discount: 'Discount',
      walletUsed: 'Wallet Used',
      total: 'Total',
      minimize: 'Minimize',
      
      // Cart Management
      cartManagement: 'Cart Management',
      removeItem: 'Remove Item',
      updateQuantity: 'Update Quantity',
      emptyCart: 'Empty Cart',
      
      // Validation Messages
      validEmail: 'Please enter a valid email address',
      minCharacters: 'Must be at least {min} characters',
      minTwoCharacters: 'Minimum 2 characters required',
      validPhone: 'Please enter a valid phone number',
      addressRequired: 'Address is required',
      cityRequired: 'City is required',
      stateRequired: 'State/Province is required',
      postalRequired: 'Postal code is required',
      countryRequired: 'Country is required',
      selectShipping: 'Please select a shipping method',
      selectPayment: 'Please select a payment method',
      
      // Units & Measurements
      kg: 'kg',
      ton: 'ton',
      liter: 'L',
      piece: 'pc',
      iqd: 'IQD',
      usd: 'USD',
      
      // New translations for checkout.tsx
      deliveryTitle: 'Delivery Address',
      useSecondaryAddress: 'Use Secondary Address',
      secondaryAddressSelected: 'Second address selected:',
      cityLabel: 'City',
      recipientInfoTitle: 'Recipient Information',
      recipientInfoLabel: 'Recipient Information',
      recipientInfoNote: 'If the recipient is a different person from the customer, fill in these fields',
      recipientNameLabel: 'Recipient Name',
      recipientNamePlaceholder: 'Full recipient name',
      recipientPhoneLabel: 'Recipient Mobile Number',
      recipientAddressLabel: 'Delivery Address',
      recipientAddressPlaceholder: 'Full delivery address',
      secondAddressOrMobile: 'Second Address or Different Mobile Number',
      secondAddressNote: 'If you need a different address or mobile number for delivery, fill in this section',
      secondAddressOptional: 'Second Address (Optional)',
      hideButton: 'Hide',
      addSecondAddress: 'Add Second Address',
      secondFullAddressLabel: 'Second Full Address',
      secondFullAddressPlaceholder: 'Second full delivery address',
      fullAddressLabel: 'Full Address',
      secondAddressDeliveryPlaceholder: 'Second address for product delivery...',
      provinceLabel: 'Province',
      selectProvincePlaceholder: 'Select Province',
      citySelectLabel: 'City',
      selectCityPlaceholder: 'Select City',
      postalCodeLabel: 'Postal Code',
      postalCodePlaceholder: 'Postal Code',
      differentMobileOptional: 'Different Mobile Number (Optional)',
      differentMobileLabel: 'Different Mobile Number',
      addDifferentNumber: 'Add Different Number',
      recipientMobileLabel: 'Recipient Mobile Number',
      thisNumberForDelivery: 'This number will be used for delivery contact',
      mobileForDeliveryContact: 'This number will be used for delivery contact',
      smsDeliveryConfirmation: 'This number will be used for SMS delivery confirmation',
      postalCodeOptional: 'Postal Code (Optional)',
      shippingMethodTitle: 'Shipping Method',
      selectShippingLabel: 'Select Shipping Method * (Smart Selection)',
      selectShippingPlaceholder: 'Select shipping method',
      smartSelectionNote: 'Smart',
      destination: 'Destination:',
      weight: 'Weight:',
      basePrice: 'Base:',
      distance: 'Distance:',
      autoCalculate: 'Auto Calculate',
      specifyDestinationCity: '📍 Please specify destination city',
      addProductsToCart: '⚖️ Add products to cart',
      erbilCity: 'Erbil',
      heavyTruck: 'Heavy',
      flammableSuffix: ' (Flammable Materials)',
      warehouseNoteActive: 'Active address:',
      warehouseNoteSecond: 'Second address',
      warehouseNoteCRM: 'CRM address',
      warehouseNotePhone: 'Active phone:',
      warehouseNoteDifferentMobile: 'Different mobile',
      warehouseNoteCRMPhone: 'CRM phone',
      orderCodeAfterCheckout: 'Order code will be provided after checkout completion',
      productCode: 'Product Code:',
      removeFromCart: 'Remove from cart',
      removedFromCartMsg: 'removed from cart',
      defaultAddressInactive: 'Default Address (Inactive)',
      defaultAddressCRM: 'Default Address (CRM)',
      provinceField: 'Province:',
      cityField: 'City:',
      phoneField: 'Phone:',
      unknown: 'Unknown',
      secondAddressOrDifferentMobile: 'Second Address or Different Mobile Number',
      
      // Order Summary Section
      orderSummaryTitle: 'Order Summary',
      itemCount: 'Item Count:',
      approximateWeight: 'Approximate Weight:',
      defaultDeliveryAddress: 'Default Delivery Address',
      activeDeliveryInfo: 'Active Delivery Address & Information',
      draggableCardMessage: 'Purchase Order card is now fully draggable! Click and drag.',
      smartVehicleSelectionLabel: 'Selected Vehicle (Smart)',
      
      // Draggable Card
      dragging: '🖱️ Dragging...',
      draggable: '🖱️ Draggable',
      dragToMove: 'Click and drag to move the card!',
      
      // Order Details
      orderContainsItems: 'Your purchase order contains {count} items',
      items: 'items',
      orderDate: 'Order Date:',
      
      // Vehicle Selection
      vehicleTypeLabel: 'Vehicle Type:',
      weightCapacityLabel: 'Weight Capacity:',
      destinationLabel: 'Destination:',
      baseCostLabel: 'Base Cost:',
      distanceFromErbil: 'Distance from Erbil:',
      kilometer: 'kilometers',
      autoCalculation: 'Auto calculation based on weight and destination',
      
      // Active Address Info
      activeAddress: 'Active Address:',
      recipientPhoneNumber: 'Recipient Phone Number:',
      infoWillBeUsed: '✅ This information will be used for order delivery',
      addressNotUsed: '⚠️ New address or number specified - This address will not be used',
      defaultAddressNote: '💡 This address will be used as the default delivery address. To change, enter a second address or different mobile number.',
      
      // Form Labels
      secondAddressTitle: 'Second Address or Different Mobile Number',
      differentMobileNumberLabel: 'Different Mobile Number',
      
      // Actions
      continueShoppingBtn: 'Continue Shopping',
      clearCartBtn: 'Clear Cart',
      cartClearedTitle: 'Cart Cleared',
      allProductsRemoved: 'All products removed from cart',
      
      // Payment Summary
      paymentSummaryTitle: 'Payment Summary',
      itemsTotal: 'Items Total:',
      shippingCostSummary: 'Shipping Cost:',
      free: 'Free',
      valueAddedTax: 'Value Added Tax (VAT)',
      valueAddedDuty: 'Value Added Duty',
      walletUsedSummary: 'Wallet Used:',
      totalPayable: 'Total Payable:',
      freeShippingEligible: '🎉 You qualify for free shipping!',
      fullyPaidByWallet: '💳 This order will be fully paid with your wallet',
    },

    // Address Selector Component
    address_selector: {
      // Page titles
      deliveryAddressTitle: 'Delivery Address',
      selectAddressDescription: 'Select the address for order delivery',
      
      // Buttons
      addNewAddress: 'Add New Address',
      addFirstAddress: 'Add First Address',
      updateButton: 'Update',
      cancelButton: 'Cancel',
      setAsDefault: 'Set as Default',
      getLocationButton: 'Get Current Location',
      gettingLocation: 'Getting location...',
      
      // Dialog titles
      editAddressTitle: 'Edit Address',
      addAddressTitle: 'Add New Address',
      enterAddressInfo: 'Enter address information',
      
      // Form labels
      addressTitle: 'Address Title',
      addressTitlePlaceholder: 'e.g., Home, Office',
      recipientNameLabel: 'Recipient Name',
      recipientNamePlaceholder: 'Full recipient name',
      recipientNameNote: 'Name is pre-filled from your account',
      fullAddressLabel: 'Full Address',
      fullAddressPlaceholder: 'Enter your full address',
      cityLabel: 'City',
      postalCodeLabel: 'Postal Code',
      postalCodePlaceholder: 'Optional',
      gpsLocationLabel: 'GPS Location',
      latitudeLabel: 'Latitude:',
      longitudeLabel: 'Longitude:',
      accuracyLabel: 'Accuracy:',
      metersUnit: 'meters',
      
      // Status messages
      defaultBadge: 'Default',
      recipientLabel: 'Recipient:',
      noAddressFound: 'No addresses found',
      loadingAddresses: 'Loading...',
      
      // Toast messages
      locationReceived: 'Location Received',
      locationReceivedDesc: 'Your current location has been recorded with {accuracy} meters accuracy',
      locationError: 'Location Error',
      locationPermissionDenied: 'Location access denied. Please enable access in browser settings',
      locationUnavailable: 'Location unavailable',
      locationTimeout: 'Location request timed out',
      browserNotSupported: 'Your browser does not support geolocation',
      addressCreated: 'New address added successfully',
      addressCreateError: 'Error creating address',
      addressUpdated: 'Address updated successfully',
      addressUpdateError: 'Error updating address',
      addressDeleted: 'Address deleted successfully',
      addressDeleteError: 'Error deleting address',
      defaultAddressSet: 'Default address set',
      defaultAddressError: 'Error setting default address',
      fetchAddressesError: 'Error fetching addresses',
      fetchCustomerInfoError: 'Error fetching customer information',
      
      // Countries
      defaultCountry: 'Iraq',
    },
    
    // Common actions
    login: 'Login',
    logout: 'Logout',
    register: 'Register',
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    search: 'Search',
    loading: 'Loading...',
    
    // Product related
    addToCart: 'Add to Cart',
    viewDetails: 'View Details',
    price: 'Price',
    quantity: 'Quantity',
    category: 'Category',
    inStock: 'In Stock',
    outOfStock: 'Out of Stock',
    
    // Cart and checkout
    cart: 'Cart',
    checkout: 'Checkout',
    total: 'Total',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    orderSummary: 'Order Summary',
    placeOrder: 'Place Order',
    
    // User account
    myAccount: 'My Account',
    myOrders: 'My Orders',
    profile: 'Profile',
    wallet: 'Wallet',
    orderHistory: 'Order History',
    
    // Product Management
    productManagement: {
      // Validation messages
      categoryRequired: 'Product category is required',
      barcodeRequired: 'Barcode field is required',
      unitPriceRequired: 'Unit price is required',
      stockRequired: 'Stock quantity is required',
      minStockRequired: 'Minimum stock level is required',
      maxStockRequired: 'Maximum stock level is required',
      netWeightRequired: 'Net weight is required',
      grossWeightRequired: 'Gross weight is required',
      grossWeightMinError: 'Gross weight must be greater than or equal to net weight',
      minMaxStockError: 'Minimum stock cannot be greater than maximum stock',
      newBatchNumberRequired: 'Batch number is required for creating new batch',
      
      // Toast messages
      batchDeleted: 'Batch deleted',
      batchDeletedDesc: 'Batch "{batchNumber}" deleted successfully',
      batchDeleteError: 'Error deleting batch',
      batchDeleteErrorDesc: 'Cannot delete batch',
      productUpdated: 'Product updated successfully',
      productUpdateError: 'Product update failed',
      duplicateSKU: 'Duplicate SKU, please enter a new code',
      productDeleted: 'Product deleted successfully and removed from shop',
      productDeleteError: 'Product deletion failed',
      enterNameCategory: 'Please enter product name and category',
      imageUploaded: 'Image {index} uploaded successfully',
      imageUploadError: 'Image upload failed',
      barcodeGenerated: 'Auto barcode generated',
      barcodeGeneratedDesc: 'EAN-13 barcode generated: {barcode}',
      confirmBatchDelete: 'Are you sure you want to delete batch "{batchNumber}"?',
      
      // Form labels and fields
      editProduct: 'Edit existing product information',
      addNewProduct: 'Add new product to catalog',
      nonChemicalProduct: 'Non-chemical product',
      nonChemicalDesc: 'Non-chemical product',
      flammableProduct: 'Flammable product',
      flammableDesc: 'Flammable product',
      baseInfo: 'Basic product information',
      productName: 'Product Name *',
      productNamePlaceholder: 'Enter product name',
      productNameHelp: 'Enter the main product name',
      categoryLabel: 'Category *',
      categoryPlaceholder: 'Select category',
      categoryHelp: 'Product category for better classification and search',
      technicalName: 'Technical Name / Grade',
      technicalNamePlaceholder: 'Technical name or product grade',
      technicalNameHelp: 'Technical name or product grade for display on sales card',
      description: 'Description',
      descriptionPlaceholder: 'Product description...',
      descriptionHelp: 'Complete description about the product, its uses and features',
      identificationPricing: 'Identification & Pricing',
      sku: 'SKU Code',
      skuPlaceholder: 'Product code or use AI',
      skuPlaceholderView: 'Product code (view only)',
      skuHelp: 'Unique product code for system identification',
      skuHelpView: 'Unique product code cannot be changed',
      barcode: 'Barcode',
      barcodePlaceholder: 'Product barcode',
      barcodeHelp: 'Product barcode for scanning and sales',
      unitPrice: 'Unit Price (IQD) *',
      unitPricePlaceholder: '0',
      unitPriceHelp: 'Product sale price per unit',
      stock: 'Stock *',
      stockPlaceholder: '0',
      stockPlaceholderEdit: 'Only in product edit',
      stockHelp: 'Available product quantity in warehouse',
      inventoryAddition: 'Add to inventory',
      inventoryAdditionPlaceholder: '0',
      batchSelection: 'Select Batch for editing',
      batchSelectionPlaceholder: 'Select batch...',
      batchOption: '📦 Batch: {batchNumber} - Stock: {stock}',
      addNewBatch: '➕ Add new batch',
      batchesAvailable: '{count} batches available for barcode {barcode}',
      selectNewBatch: 'To add new batch, select "➕ Add new batch"',
      currentBatchNumber: 'Current batch number',
      newBatchNumber: 'New batch number',
      batchNumberPlaceholder: 'Batch number',
      batchNumberHelp: 'New batch number for catalog',
      batchNumberHelpCurrent: 'Current batch number - stock will be added to this batch',
      stockWillBeAdded: '✅ Stock will be added to this batch',
      minStock: 'Minimum Stock *',
      minStockPlaceholder: '0',
      minStockHelp: 'Minimum stock level for shortage alert',
      maxStock: 'Maximum Stock *',
      maxStockPlaceholder: '0',
      maxStockHelp: 'Maximum warehouse storage capacity for product',
      weightRow: 'Weight row',
      netWeight: 'Net Weight *',
      netWeightPlaceholder: '0',
      netWeightHelp: 'Product net weight without packaging',
      netWeightHelpView: 'Weight can only be changed when creating new product',
      grossWeight: 'Gross Weight',
      grossWeightPlaceholder: '0',
      grossWeightHelp: 'Total product weight with packaging (for transportation)',
      grossWeightHelpView: 'Weight can only be changed when creating new product',
      weightUnit: 'Unit',
      syncWithShop: 'Display in online shop',
      showWhenOutOfStock: 'Show even when out of stock',
      productImages: 'Product Images (Max 3 images)',
      productImagesFromMain: 'Product Images (from main product)',
      imagesHelp: 'Max 3 product images for display in catalog and shop. Supports JPG, PNG, GIF - Max 2MB',
      imagesHelpBatch: 'Images fetched from main product. You can change them if needed.',
      selectPrimaryImage: 'Select primary image:',
      selectPrimaryImageHelp: 'Click the circle button at bottom left of each image (Selected image: {index})',
      selectPrimaryImageHelpDB: 'Images fetched from database and editable (Primary image: {index})',
      imageNumber: 'Image {index}',
      imagePreview: 'Image preview {index}',
      setPrimaryImage: 'Set as primary image {selected}',
      selectImage: 'Select image',
      imageUrlPlaceholder: 'Image URL {index}',
      productCatalog: 'Product Catalog (PDF)',
      catalogHelp: 'Product catalog or brochure in PDF format for additional information',
      catalogFile: 'Catalog file',
      selectCatalog: 'Select catalog',
      catalogName: 'Catalog file name',
      catalogNamePlaceholder: 'catalog.pdf',
      showToCustomers: 'Show to customers',
      catalogURL: 'Catalog URL',
      catalogURLPlaceholder: 'Catalog URL',
      msds: 'MSDS',
      msdsHelp: 'Material Safety Data Sheet for safety information',
      msdsFile: 'MSDS file',
      selectMSDS: 'Select MSDS',
      msdsName: 'MSDS file name',
      msdsNamePlaceholder: 'msds.pdf',
      msdsURL: 'MSDS URL',
      msdsURLPlaceholder: 'MSDS URL',
      updateProduct: 'Update Product',
      addProduct: 'Add Product',
      confirmDelete: 'Confirm product deletion',
      confirmDeleteDesc: 'Are you sure you want to delete product "{name}"?',
      confirmDeleteWarning: 'This action is irreversible and the product will be deleted from both catalog and shop systems.',
      cancel: 'Cancel',
      deleteProduct: 'Delete Product',
      activeBatch: 'Active batch (selling):',
      fifoSystem: 'FIFO System - oldest batch with stock',
      totalStock: 'Total stock: {stock}',
      onlyBatchesWithStock: 'Only batches with stock',
      deleteBatch: 'Delete batch',
      netWeightLabel: 'Net weight:',
      grossWeightLabel: 'Gross weight:',
      weightLabel: 'Weight:',
      
      // Additional UI elements
      hideFromShop: 'Hide from shop',
      showInShop: 'Show in shop',
      manageBatches: 'Manage Batches',
      sellingNow: 'Selling',
      inQueue: 'In queue',
      clickToOpenCatalog: 'Click to open catalog',
      clickToOpenMSDS: 'Click to open MSDS',
      manualMode: 'Manual',
      currencyIQD: 'Iraqi Dinar (IQD)',
      currencyUSD: 'US Dollar (USD)',
      currencyEUR: 'Euro (EUR)',
      currencyTRY: 'Turkish Lira (TRY)',
      currentStock: 'Current Stock',
      addStock: 'Add Stock',
      onlyForEdit: 'Edit only',
      editOnly: 'Only in existing product edit',
      editOnlyPlaceholder: 'Only in existing product edit',
      fileManagement: 'File & Document Management',
      uploadingFile: 'Uploading...',
      viewCatalog: 'View Catalog',
      uploadCatalog: 'Upload Catalog',
      viewMSDS: 'View MSDS',
      uploadMSDS: 'Upload MSDS',
      imageUrlsLabel: 'Image URLs',
      primaryImageLabel: 'Primary',
      productImagesMain: 'Product Images (from main product)',
      editableIfNeeded: 'Editable if needed',
      imagesFetchedFromMain: 'Images fetched from main product. You can change them if needed.',
      imagesFetchedHelp: 'Max 3 product images for display in catalog and shop. Supports JPG, PNG, GIF - Max 2MB',
      imagesFetchedFromDB: 'Images fetched from database and editable (Primary image: {index})',
      clickCircleButton: 'Click the circle button at bottom left of each image (Selected image: {index})',
      uploadImage: 'Uploading...',
      clickToSelectPDF: 'Click to select {type} PDF',
      onlyPDF: 'PDF files only',
      incompleteInfo: '⚠️ Incomplete Information',
      enterNameCategoryFirst: 'Please enter product name and category first',
      standard13Barcode: '13-digit standard barcode',
      manualInputPreventsAuto: 'Manual entry prevents auto-generation',
      barcode13Placeholder: '13-digit barcode',
      pricePerUnit: 'Price per unit in selected currency',
      stockManagement: 'Stock & Weight Management',
      stockRow: 'Stock row',
      stockNotEditable: 'Current product stock in warehouse (not directly editable)',
      initialStockHelp: 'Initial stock quantity to register for this new product',
      stockAdditionHelp: 'Stock quantity you want to add to warehouse (only in existing product edit)',
      chemical: 'Chemical',
      allBatches: 'All Batches',
      unit: 'unit',
      units: 'units',
      editable: 'Editable',
      imagesUploadSection: 'Image upload',
      selectPrimaryImageTitle: 'Select primary image',
      imageFromMain: 'Product images (from main product)',
      maxThreeImages: 'Max 3 images',
      catalogActionsButtons: 'Catalog action buttons',
      msdsSection: 'MSDS section',
      msdsActionsButtons: 'MSDS action buttons',
      msdsSettings: 'MSDS settings',
      catalogSettings: 'Catalog settings',
      showToCustomersLabel: 'Show to customers',
      showToCustomersHelp: '{type} downloadable in shop',
      hidden: 'Hidden',
      forChemicalOnly: 'For chemical products only',
      newBatchField: 'New batch number field',
      selectBatchForEdit: 'Select Batch for editing',
      selectBatchPlaceholderText: 'Select batch...',
      allBatchesCount: 'All Batches ({count}):',
      totalStockLabel: 'Total stock: {stock}',
      onlyWithStock: 'Only batches with stock',
      batch: 'Batch',
      batchNum: 'Batch {number}',
      initialFixedValue: 'Initial fixed value',
      fixedValue: 'Fixed value',
      selectWeightUnit: 'Select unit',
      weightUnitKg: 'Kilogram (kg)',
      weightUnitG: 'Gram (g)',
      weightUnitLb: 'Pound (lb)',
      weightUnitOz: 'Ounce (oz)',
      weightUnitT: 'Ton (t)',
      tagsLabel: 'Product Tags',
      tagsHelp: 'Separate tags with commas. These tags will be displayed in the shop',
      tagsPlaceholder: 'Example: chemical, industrial, cleaner',
      showWhenOutOfStockDesc: 'Show product even when out of stock',
      clickToSelectCatalog: 'Click to select catalog PDF',
      clickToSelectMSDS: 'Click to select MSDS PDF',
      catalogDownloadable: 'Catalog downloadable in shop',
      msdsDownloadable: 'MSDS downloadable in shop',
      inStock: 'In Stock',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      activeFilters: 'Active Filters:',
      statusLabel: 'Status',
      visibilityLabel: 'Visibility',
      hiddenProducts: 'Hidden Products',
      visibleProducts: 'Visible Products',
      searchLabel: 'Search',
      clearAll: 'Clear All',
      totalProducts: 'Total Products',
      fileTooLarge: 'File Too Large',
      fileTooLargeDesc: 'File must be less than 2MB. Please compress or resize the file.',
      invalidFormat: 'Invalid Format',
      invalidImageFormat: 'Only JPEG, PNG, and WebP images are allowed for optimal customer display.',
      invalidPDFFormat: 'Only PDF files are allowed for documents.',
      uploadError: 'Upload Error',
      uploadFailed: 'Failed to upload file',
      success: 'Success',
      imageUploadedSuccess: 'Image uploaded successfully - optimized for customer display',
      technicalSpecifications: 'Technical Specifications',
      technicalSpecificationsPlaceholder: 'Enter technical specifications as JSON or text...',
      technicalSpecificationsHelp: 'Product technical details visible to customers in shop',
      productFeatures: 'Product Features',
      productFeaturesPlaceholder: 'Enter product features (one per line)',
      productFeaturesHelp: 'Key features visible to customers - one per line',
      productApplications: 'Product Applications',
      productApplicationsPlaceholder: 'Enter product applications (one per line)',
      productApplicationsHelp: 'Common uses and applications - one per line',
      batchInfoNotAvailable: 'Batch information not available',
      displayMode: 'Product Display Mode',
      displayModeHelp: 'Choose how customers will view this product in the shop',
      displayModeImages: 'Image Gallery (3 photos)',
      displayMode3D: '3D Interactive Model',
      model3dFile: '3D Model File',
      uploadModel3d: 'Upload 3D Model',
      viewModel3d: 'View 3D Model',
      deleteModel3d: 'Delete 3D Model',
      model3dHelp: 'Upload GLB or GLTF file for interactive 3D product viewing (Max 10MB)',
      model3dFormats: 'Supported formats: GLB, GLTF',
      model3dUploaded: '3D model uploaded successfully',
      model3dDeleted: '3D model deleted successfully',
      invalidModel3dFormat: 'Only GLB and GLTF files are allowed for 3D models',
      model3dTooLarge: '3D model file must be less than 10MB',
      rotate3dModel: 'Drag to rotate',
      zoom3dModel: 'Scroll to zoom',
      loading3dModel: 'Loading 3D model...',
      error3dModel: 'Error loading 3D model',
      pageTitle: 'Product Management',
      pageSubtitle: 'Manage products across five categories',
      backToAdmin: 'Back to Admin',
      logout: 'Logout',
      searchPlaceholder: 'Search by name, barcode, or SKU...',
      allProducts: 'All Products',
      noProductsFound: 'No products found',
      noProductsAvailable: 'No products available',
      noProductsMatch: 'No products match "{query}". Try searching by name, barcode, or SKU.',
      addFirstProduct: 'Add your first product to get started.',
      clearSearch: 'Clear Search',
      discontinued: 'Discontinued',
      unknown: 'Unknown',
      noBarcode: 'N/A',
      variant: 'Variant',
      companyLabel: 'Company',
      temperatureLabel: 'Transportation temperature:',
      temperatureNone: 'No temperature restriction',
      temperatureFrozen: 'Frozen: -18°C to 0°C',
      temperatureChilled: 'Chilled: +2°C to +8°C',
      temperatureCool: 'Cool: +8°C to +15°C',
      temperatureDry: 'Ambient temperature (Dry): 15°C to 25°C',
      assignVendor: 'Assign to Vendor (Optional)',
      assignVendorHelp: 'Optionally assign this product to a marketplace vendor',
      selectVendor: 'Select vendor (optional)',
      noVendor: 'No Vendor (Company Product)',
      fileTooLargeTitle: 'File Too Large',
      imageTooLargeDesc: 'Image must be less than 2MB. Please compress or resize the image.',
      invalidImageFormatDesc: 'Only JPEG, PNG, and WebP images are allowed for optimal customer display.',
      imageUploadSuccess: 'Image uploaded successfully - optimized for customer display',
      uploadErrorTitle: 'Upload Error',
      imageUploadFailed: 'Failed to upload image',
      invalidImageFormatsDesc: 'Only JPEG, PNG, WEBP, and GIF images are allowed.',
      removeImageError: 'Failed to remove product image',
      imageFileTypes: 'JPG, PNG, WEBP, GIF',
      model3dFileTypes: '.glb / .gltf files only',
      removeCatalogError: 'Failed to remove catalog file',
      removeMsdsError: 'Failed to remove MSDS file',
      catalogFilename: 'catalog.pdf',
      msdsFilename: 'msds.pdf',
      selected: 'Selected',
      model3dPreview: '3D Model Preview',
      aiGenerate: 'AI',
    },
    
    // Batch Management
    batchManagement: {
      pageTitle: 'Batch Management (FIFO)',
      pageSubtitle: 'Manage product batches with FIFO system',
      searchBatches: 'Search Batches',
      searchDescription: 'Enter product barcode to view all batches',
      barcodeLabel: 'Product Barcode',
      barcodePlaceholder: 'Example: 8649677123456',
      searchButton: 'Search',
      currentSellingBatch: 'Active Selling Batch (LIFO)',
      currentSellingDescription: 'This batch is currently selected for sales',
      batchNumber: 'Batch Number',
      stock: 'Stock',
      stockUnits: 'units',
      productionDate: 'Production Date',
      activeStatus: 'Active',
      totalBatches: 'Total Batches',
      totalStock: 'Total Stock',
      barcode: 'Barcode',
      emptyBatches: 'Empty Batches',
      batchList: 'Batch List (FIFO)',
      batchListDescription: 'Older batches are sold first (First In, First Out)',
      soldOut: 'Sold Out',
      selling: 'Selling',
      waiting: 'Waiting',
      price: 'Price',
      netWeight: 'Net Weight',
      batchNotFound: 'Batch Not Found',
      noBatchesMessage: 'No batches registered for barcode',
      loadingBatches: 'Loading batch information...',
    },
    
    // Wallet specific
    walletTitle: 'Customer Wallet',
    walletSubtitle: 'Manage your account balance and transactions',
    currentBalance: 'Current Balance',
    creditLimit: 'Credit Limit',
    status: 'Status',
    lastActivity: 'Last Activity',
    addFunds: 'Add Funds',
    transactions: 'Transactions',
    rechargeRequests: 'Recharge Requests',
    amount: 'Amount',
    currency: 'Currency',
    paymentMethod: 'Payment Method',
    paymentReference: 'Payment Reference',
    notes: 'Notes',
    pending: 'Pending',
    completed: 'Completed',
    rejected: 'Rejected',
    active: 'Active',
    inactive: 'Inactive',
    credit: 'Credit',
    debit: 'Debit',
    type: 'Type',
    description: 'Description',
    date: 'Date',
    requestNumber: 'Request #',
    totalSpent: 'Total Spent',
    totalRecharged: 'Total Recharged',
    noTransactions: 'No transactions found',
    noRechargeRequests: 'No recharge requests found',
    rechargeSuccess: 'Recharge request submitted successfully',
    optional: 'Optional',
    bankTransfer: 'Bank Transfer',
    onlinePayment: 'Online Payment',
    cashPayment: 'Cash Payment',
    mobileWallet: 'Mobile Wallet',
    processing: 'Processing...',
    allTransactions: 'All Transactions',
    recentTransactions: 'Recent Transactions',
    quickActions: 'Quick Actions',
    manageWallet: 'Manage your wallet',
    walletRechargeRequest: 'Wallet Recharge Request',
    fillRechargeDetails: 'Fill in the details below to request a wallet recharge',
    enterAmount: 'Enter amount',
    selectPaymentMethod: 'Select payment method',
    iraqiDinar: 'Iraqi Dinar (IQD)',
    usDollar: 'US Dollar (USD)',
    euro: 'Euro (EUR)',
    enterPaymentReference: 'Enter payment reference (optional)',
    enterNotes: 'Enter notes (optional)',
    bankReference: 'Bank Reference Number',
    enterBankReference: 'Enter bank reference number',
    rechargeAmount: 'Recharge Amount',
    bankReceipt: 'Bank Receipt',
    rechargeHistory: 'Recharge History',
    uploadBankReceipt: 'Upload bank receipt (JPG, PNG, PDF)',
    bankReceiptRequired: 'Bank receipt is required for bank transfer',
    bankReferenceRequired: 'Bank reference number is required for bank transfer',
    inputError: 'Input Error',
    validAmount: 'Please enter a valid amount',
    requestError: 'Request Error',
    errorCreatingRequest: 'Error creating wallet recharge request',
    loginToAccessWallet: 'Please log in to access your wallet',
    goToLogin: 'Go to Login',
    totalWithdrawals: 'Total withdrawals',
    totalDeposits: 'Total deposits',
    requestSubmitted: 'Your wallet recharge request has been submitted successfully and is pending approval.',
    requestPendingApproval: 'Request pending approval',
    
    // Wallet Management (Admin)
    walletHolders: 'Wallet Holders',
    walletManagement: 'Wallet Management',
    changeAmount: 'Change Amount',
    reason: 'Reason',
    apply: 'Apply',
    modifyBalance: 'Modify Balance',
    addSubtractAmount: 'Add/Subtract Amount',
    reasonForChange: 'Reason for Change',
    requestRecharge: 'Request Recharge',
    allWalletHolders: 'All customers who have wallets',
    noWalletsFound: 'No wallets found',
    syncWallet: 'Sync Wallet',
    
    // Customer Profile
    welcomeCustomer: 'Welcome',
    customerProfile: 'Customer Profile',
    manageAccount: 'Manage your account and view order history',
    editProfile: 'Edit Profile',
    continueShopping: 'Continue Shopping',
    accountInformation: 'Account Information',
    fullName: 'Full Name',
    contactDetails: 'Contact Details',
    orderNumber: 'Order Number',
    totalAmount: 'Total Amount',
    noOrders: 'No orders found',
    viewOrder: 'View Order',
    orderDate: 'Order Date',
    orderStatus: 'Order Status',
    confirmed: 'Confirmed',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    logoutSuccessful: 'Logout Successful',
    logoutSuccessfulDesc: 'You have been logged out successfully',
    logoutError: 'An error occurred during logout',
    error: 'Error',
    
    // Forms
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    city: 'City',
    country: 'Country',
    company: 'Company',
    
    // Messages
    welcomeMessage: 'Welcome to Momtazchem',
    thankYou: 'Thank You',
    orderConfirmed: 'Your order has been confirmed',
    contactSuccess: 'Your message has been sent successfully',
    
    // Auth & Login
    auth: {
      login: 'Login',
      register: 'Register',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot your password?',
      loggingIn: 'Logging in...',
      registering: 'Registering...',
      welcome: 'Welcome',
      or: 'Or',
      continueWithGoogle: 'Continue with Google',
      continueWithFacebook: 'Continue with Facebook',
      loginSuccess: 'Successfully logged in',
      invalidCredentials: 'Invalid email or password',
      loginError: 'Login Error',
      serverError: 'Server connection error. Please try again',
      networkError: 'Network Error',
      networkErrorDesc: 'Connection problem. Please try again.',
      enterEmail: 'Enter your email',
      enterPassword: 'Enter your password',
      switchToLogin: 'Switch to Login',
      customerLogin: 'Customer Login',
      signInOrRegister: 'Sign in to your account or create a new one',
      verifyMobileNumber: 'Verify Mobile Number',
      verificationCodeDescription: 'Enter the verification code sent to your mobile',
      smsVerification: 'SMS Verification',
      verificationCodeSent: 'We\'ve sent a 4-digit code to',
      codeSentTo: 'We\'ve sent a code to',
      enterVerificationCode: 'Enter Verification Code',
      enterCodePlaceholder: 'Enter 4-digit code',
      enter4DigitCode: 'Enter 4-digit code',
      fourDigitCode: '4-digit code',
      sixDigitCode: '6-digit code',
      verifying: 'Verifying...',
      verifyCode: 'Verify Code',
      verifyCodes: 'Verify Codes',
      resend: 'Resend',
      back: 'Back',
      basicInformation: 'Basic Information',
      contactInformation: 'Contact Information',
      addressInformation: 'Address Information',
      additionalInformation: 'Additional Information',
      mobileNumber: 'Mobile Number',
      whatsappNumber: 'WhatsApp Number (if different)',
      whatsappDefault: 'Defaults to mobile number',
      whatsappOptional: 'WhatsApp number (optional)',
      leaveEmptyIfSame: 'Leave empty if same as mobile number',
      alternatePhone: 'Alternate Phone',
      province: 'Province',
      selectProvince: 'Select province',
      selectCity: 'Select city',
      selectCountry: 'Select country',
      fullAddress: 'Full address',
      secondaryAddress: 'Secondary Address',
      postalCode: 'Postal Code',
      industry: 'Industry',
      businessType: 'Business Type',
      companySize: 'Company Size',
      manufacturer: 'Manufacturer',
      distributor: 'Distributor',
      retailer: 'Retailer',
      endUser: 'End User',
      small: 'Small (1-50 employees)',
      medium: 'Medium (51-250 employees)',
      large: 'Large (251-1000 employees)',
      enterprise: 'Enterprise (1000+ employees)',
      communicationPreference: 'Communication Preference',
      preferredLanguage: 'Preferred Language',
      english: 'English',
      arabic: 'Arabic',
      persian: 'Persian',
      marketingConsent: 'I agree to receive marketing communications',
      requiredField: 'Required field',
      verificationCodesSent: 'Verification codes sent',
      verificationCodesError: 'Error sending verification codes',
      registrationSuccessful: 'Registration Successful',
      accountCreated: 'Your account has been created successfully',
      registrationError: 'Registration Error',
      invalidCodes: 'Invalid verification codes',
      verificationError: 'Error verifying codes. Please try again',
      smsCodeLabel: 'SMS Verification Code',
      emailCodeLabel: 'Email Verification Code',
      sentTo: 'sent to',
      and: 'and',
      verify: 'Verify',
      emailAlreadyRegistered: 'Email Already Registered',
      emailAlreadyRegisteredDesc: 'This email is already registered. Please login instead.',
      emailAlreadyRegisteredMessage: 'This email is already registered',
      creatingAccount: 'Creating account...',
      createAccount: 'Create Account',
      dualVerification: 'Dual Verification',
      verificationCodesSentTo: 'Verification codes have been sent to',
      profileUpdated: 'Profile Updated',
      profileUpdatedDesc: 'Your profile has been updated successfully',
      updateError: 'Update Error',
      updateFailed: 'Failed to update profile',
      registrationVerificationSent: 'Registration Successful',
      verificationSentDesc: 'A verification code has been sent to your mobile number',
      
      // Validation Messages
      validation: {
        invalidEmail: 'Please enter a valid email',
        passwordMin6: 'Password must be at least 6 characters',
        firstNameMin2: 'First name must be at least 2 characters',
        lastNameMin2: 'Last name must be at least 2 characters',
        phoneMin10: 'Phone number is required',
        countryRequired: 'Country is required',
        provinceRequired: 'Province is required',
        cityRequired: 'City is required',
        addressMin5: 'Address is required',
        passwordsMustMatch: 'Passwords must match',
      },
    },
    
    // Notifications and Toast Messages
    success: 'Success',
    errorOccurred: 'Error Occurred',
    warning: 'Warning',
    info: 'Information',
    loginSuccessful: 'Login Successful',
    loginFailed: 'Login Failed',
    registrationSuccessful: 'Registration Successful',
    registrationFailed: 'Registration Failed',
    orderCreated: 'Order Created Successfully',
    orderFailed: 'Order Creation Failed',
    addedToCart: 'Product Added to Cart',
    removedFromCart: 'Product Removed from Cart',
    cartCleared: 'Cart Cleared',
    profileUpdated: 'Profile Updated Successfully',
    profileUpdateFailed: 'Profile Update Failed',
    passwordChanged: 'Password Changed Successfully',
    passwordChangeFailed: 'Password Change Failed',
    emailSent: 'Email Sent Successfully',
    emailFailed: 'Email Sending Failed',
    dataLoaded: 'Data Loaded Successfully',
    dataLoadFailed: 'Data Loading Failed',
    unauthorized: 'Unauthorized',
    unauthorizedDesc: 'You are logged out. Logging in again...',
    productNotFound: 'Product Not Found',
    networkError: 'Network Error',
    tryAgain: 'Please try again',
    pleaseWait: 'Please wait...',
    
    // Product categories
    waterTreatment: 'Water Treatment',
    fuelAdditives: 'Fuel Additives',
    paintThinner: 'Paint Thinner',
    agriculturalFertilizers: 'Agricultural Fertilizers',
    paintSolvents: 'Paint & Solvents',
    industrialChemicals: 'Industrial Chemicals',
    technicalEquipment: 'Technical Equipment',
    commercialGoods: 'Commercial Goods',
    
    // Product category descriptions
    fuelAdditivesDesc: 'High-performance fuel additives for enhanced engine efficiency',
    waterTreatmentDesc: 'Comprehensive water treatment solutions for all applications',
    paintSolventsDesc: 'Premium paint formulations and specialty solvents',
    agriculturalFertilizersDesc: 'Advanced fertilizer solutions for sustainable farming',
    industrialChemicalsDesc: 'Professional industrial chemical solutions',
    paintThinnerDesc: 'Specialty paint thinners and related products',
    technicalEquipmentDesc: 'Professional technical equipment and tools',
    commercialGoodsDesc: 'Commercial goods and business solutions',
    
    // Product Reviews
    productReviews: 'Product Reviews',
    customerReviews: 'Customer Reviews',
    addYourReview: 'Add Your Review',
    writeReview: 'Write Review',
    rating: 'Rating',
    comment: 'Comment',
    customerName: 'Customer Name',
    submitReview: 'Submit Review',
    reviewSubmitted: 'Review Submitted',
    reviewSubmittedDesc: 'Your review has been submitted successfully',
    reviewError: 'Error Submitting Review',
    reviewErrorDesc: 'Error',
    loadingReviews: 'Loading reviews...',
    customerReviewTitle: 'Customer Review about',
    backToShop: 'Back to Shop',
    averageRating: 'Average Rating',
    totalReviews: 'Total Reviews',
    noReviewsYet: 'No Reviews Yet',
    noReviewsDesc: 'Be the first to review this product',
    productSpecifications: 'Specifications',
    reviewsAndRatings: 'Reviews & Ratings',
    customerFeedback: 'Customer Feedback',
    productReviewsFor: 'Product Reviews:',
    totalReviewsCount: 'Total Reviews',
    loginToReview: 'Login to Submit a Review',
    loginToReviewDesc: 'To submit a review and rate products, please login to your account first',
    reviewingAs: 'Reviewing as:',
    yourPreviousReview: 'Your Previous Review:',
    editReview: 'Edit Review',
    postedOn: 'Posted on:',
    editYourReview: 'Edit your review...',
    updateReview: 'Update Review',
    beFirstToReview: 'Be the first to review',
    you: '(You)',
    reviewUpdated: 'Review Updated Successfully',
    reviewUpdatedDesc: 'Your changes have been saved',
    review: 'review',
    reviews: 'reviews',
    
    // Footer
    aboutCompany: 'About Company',
    contactInfo: 'Contact Information',
    followUs: 'Follow Us',
    allRightsReserved: 'All Rights Reserved',
    
    // Home Page - Hero Section
    advancedChemical: 'Advanced Chemical',
    solutions: 'Solutions',
    forIndustry: 'for Industry',
    heroDescription: 'Leading manufacturer of premium fuel additives, water treatment systems, paint & thinner products, and agricultural fertilizers for global industries.',
    exploreProducts: 'Explore Products',
    contactSales: 'Contact Sales',
    callForPrice: 'Contact for Price',
    
    // Home Page - Products
    ourProductPortfolio: 'Our Product Portfolio',
    productPortfolioDesc: 'Comprehensive chemical solutions across four key industries, engineered for performance and reliability.',
    products_plural: 'Products',
    availableProducts: 'Available Products:',
    moreProducts: 'more products',
    viewAll: 'View All',
    aboutMomtazchem: 'About Momtazchem',
    aboutMomtazchemDesc1: 'With over 25 years of excellence in chemical manufacturing, Momtazchem has established itself as a trusted partner for industries worldwide. Our commitment to innovation, quality, and sustainability drives everything we do.',
    aboutMomtazchemDesc2: 'From our state-of-the-art facilities, we develop and produce high-quality chemical solutions that meet the evolving needs of fuel, water treatment, paint, and agricultural industries.',
    learnMoreAboutUs: 'Learn More About Us',
    customerSatisfaction: 'Customer Satisfaction',
    ourServicesCapabilities: 'Our Services & Capabilities',
    servicesCapabilitiesDesc: 'Comprehensive support from research and development to delivery and technical assistance.',
    rdServices: 'R&D Services',
    rdServicesDesc: 'Custom formulation development and product optimization to meet specific industry requirements.',
    customFormulations: 'Custom Formulations',
    productTesting: 'Product Testing',
    performanceAnalysis: 'Performance Analysis',
    globalDistribution: 'Global Distribution',
    globalDistributionDesc: 'Reliable supply chain and logistics network ensuring timely delivery worldwide.',
    countries40Plus: '40+ Countries',
    expressShipping: 'Express Shipping',
    bulkOrders: 'Bulk Orders',
    technicalSupport: 'Technical Support',
    technicalSupportDesc: 'Expert technical assistance and consultation for optimal product application and performance.',
    support24_7: '24/7 Support',
    applicationTraining: 'Application Training',
    documentation: 'Documentation',
    
    // About page
    aboutTitle: 'About Momtazchem',
    aboutSubtitle: 'Leading the chemical industry with innovation, quality, and sustainability for over 25 years.',
    ourStory: 'Our Story',
    ourMission: 'Our Mission',
    ourVision: 'Our Vision',
    ourCoreValues: 'Our Core Values',
    valuesSubtitle: 'The principles that guide our decisions and shape our culture every day.',
    ourTeamExpertise: 'Our Team & Expertise',
    certificationsCompliance: 'Certifications & Compliance',
    certificationsSubtitle: 'We maintain the highest industry standards and certifications to ensure quality, safety, and environmental responsibility.',
    
    // About content
    storyParagraph1: 'Founded in 1999, Momtazchem began as a small chemical manufacturing company with a vision to provide high-quality chemical solutions to industries worldwide. Over the past 25 years, we have grown into a leading manufacturer serving four key market segments.',
    storyParagraph2: 'Our journey has been marked by continuous innovation, strategic expansion, and an unwavering commitment to quality. Today, we operate state-of-the-art manufacturing facilities and serve customers in over 40 countries across the globe.',
    storyParagraph3: 'As we look to the future, we remain dedicated to advancing chemical science, supporting our customers\' success, and contributing to a more sustainable world.',
    missionText: 'To develop and manufacture innovative chemical solutions that enhance industrial processes, improve product performance, and contribute to sustainable development while maintaining the highest standards of quality and safety.',
    visionText: 'To be the world\'s most trusted partner in chemical solutions, recognized for our innovation, sustainability, and commitment to advancing industries while protecting the environment for future generations.',
    teamText: 'Our success is built on the expertise and dedication of our team. We employ over 500 professionals, including chemical engineers, research scientists, quality specialists, and industry experts.',
    
    // Values
    qualityExcellence: 'Quality Excellence',
    qualityExcellenceDesc: 'We maintain the highest standards in all our products and processes, with ISO certifications ensuring consistent quality.',
    sustainability: 'Sustainability',
    sustainabilityDesc: 'Committed to sustainable practices and environmentally responsible solutions',
    environmentalResponsibility: 'Environmental Responsibility',
    environmentalResponsibilityDesc: 'Committed to sustainable manufacturing practices and developing eco-friendly chemical solutions.',
    customerFocus: 'Customer Focus',
    customerFocusDesc: 'Our customers\' success is our priority. We provide tailored solutions and exceptional service.',
    globalReach: 'Global Reach',
    globalReachDesc: 'Serving customers in over 40 countries with reliable supply chains and local support.',
    
    // Stats
    employees: 'Employees',
    rdScientists: 'R&D Scientists',
    manufacturingSites: 'Manufacturing Sites',
    qualityRate: 'Quality Rate',
    
    // Certifications
    iso9001: 'ISO 9001:2015',
    iso9001Desc: 'Quality Management Systems',
    iso14001: 'ISO 14001',
    iso14001Desc: 'Environmental Management',
    ohsas18001: 'OHSAS 18001',
    ohsas18001Desc: 'Occupational Health & Safety',
    reachCompliance: 'REACH Compliance',
    reachComplianceDesc: 'European Chemicals Regulation',
    
    // Product Form
    addProduct: 'Add Product',
    editProduct: 'Edit Product',
    productName: 'Product Name',
    shortDescription: 'Short Description',
    productDescription: 'Product Description',
    priceRange: 'Price Range',
    productCategory: 'Product Category',
    productFeatures: 'Product Features',
    productApplications: 'Product Applications',
    productTags: 'Product Tags',
    productImage: 'Product Image',
    productCatalog: 'Product Catalog',
    msdsDocument: 'MSDS Document',
    stockQuantity: 'Stock Quantity',
    minStockLevel: 'Minimum Stock Level',
    maxStockLevel: 'Maximum Stock Level',
    unitPrice: 'Unit Price',
    netWeight: 'Net Weight',
    grossWeight: 'Gross Weight',
    weightUnit: 'Weight Unit',
    batchNumber: 'Batch Number',
    productSku: 'Product SKU',
    productBarcode: 'Product Barcode',
    isVariant: 'Is Product Variant',
    parentProduct: 'Parent Product',
    variantType: 'Variant Type',
    variantValue: 'Variant Value',
    syncWithShop: 'Sync with Shop',
    showWhenOutOfStock: 'Show When Out of Stock',
    showCatalogToCustomers: 'Show Catalog to Customers',
    showMsdsToCustomers: 'Show MSDS to Customers',
    basicInfo: 'Basic Information',
    pricingInventory: 'Pricing & Inventory',
    documentsMedia: 'Documents & Media',
    variantSettings: 'Variant Settings',
    shopSettings: 'Shop Settings',
    weightsAndBatch: 'Weights & Batch',
    productDetails: 'Product Details',
    
    // Contact Page
    contactPage: {
      // Form Labels
      firstName: 'First Name',
      lastName: 'Last Name',
      emailAddress: 'Email Address',
      company: 'Company',
      productInterest: 'Product Interest',
      message: 'Message',
      
      // Form Placeholders
      firstNamePlaceholder: 'John',
      lastNamePlaceholder: 'Doe',
      emailPlaceholder: 'john@company.com',
      companyPlaceholder: 'Your Company',
      productInterestPlaceholder: 'Select a product category',
      messagePlaceholder: 'Tell us about your requirements...',
      
      // Product Categories
      waterTreatment: 'Water Treatment',
      fuelAdditives: 'Fuel Additives',
      paintThinner: 'Paint & Thinner',
      agriculturalFertilizers: 'Agricultural Fertilizers',
      industrialChemicals: 'Industrial Chemicals',
      technicalEquipment: 'Technical Equipment',
      commercialGoods: 'Commercial Goods',
      customSolutions: 'Custom Solutions',
      
      // Buttons
      sending: 'Sending...',
      sendMessage: 'Send Message',
      
      // Toast Messages
      messageSent: 'Message Sent Successfully',
      messageSentDesc: 'Thank you for your inquiry. We will get back to you within 24 hours.',
      errorTitle: 'Error',
      errorDesc: 'Failed to send message. Please try again.',
      
      // Sections
      contactInformation: 'Contact Information',
      ourCertifications: 'Our Certifications',
      findUs: 'Find Us',
      visitHeadquarters: 'Visit our headquarters and manufacturing facilities',
      getDirections: 'Get Directions',
      viewInMaps: 'View in Google Maps',
    },
    
    // Services Page
    servicesPage: {
      title: 'Our Services & Capabilities',
      subtitle: 'Comprehensive support from research and development to delivery and technical assistance, ensuring your success every step of the way.',
      
      rdTitle: 'Research & Development',
      rdDesc: 'Custom formulation development and product optimization to meet your specific requirements.',
      rdFeature1: 'Custom Chemical Formulations',
      rdFeature2: 'Product Performance Testing',
      rdFeature3: 'Regulatory Compliance Support',
      rdFeature4: 'Scale-up from Lab to Production',
      rdFeature5: 'Quality Optimization',
      rdFeature6: 'Application Development',
      
      distributionTitle: 'Global Distribution',
      distributionDesc: 'Reliable supply chain and logistics network ensuring timely delivery worldwide.',
      distFeature1: '40+ Countries Coverage',
      distFeature2: 'Express Shipping Options',
      distFeature3: 'Bulk Order Handling',
      distFeature4: 'Cold Chain Management',
      distFeature5: 'Real-time Tracking',
      distFeature6: 'Local Warehousing',
      
      techSupportTitle: 'Technical Support',
      techSupportDesc: 'Expert technical assistance and consultation for optimal product application.',
      techFeature1: '24/7 Technical Helpline',
      techFeature2: 'Application Training',
      techFeature3: 'Troubleshooting Support',
      techFeature4: 'Performance Optimization',
      techFeature5: 'Safety Guidelines',
      techFeature6: 'Documentation Support',
      
      consultingTitle: 'Consulting Services',
      consultingDesc: 'Strategic consulting to help optimize your chemical processes and operations.',
      consultFeature1: 'Process Optimization',
      consultFeature2: 'Cost Reduction Analysis',
      consultFeature3: 'Sustainability Assessment',
      consultFeature4: 'Regulatory Guidance',
      consultFeature5: 'Market Analysis',
      consultFeature6: 'Strategic Planning',
      
      qaTitle: 'Quality Assurance',
      qaDesc: 'Comprehensive quality control and assurance programs for all our products.',
      qaFeature1: 'ISO Certified Processes',
      qaFeature2: 'Batch Testing & Analysis',
      qaFeature3: 'Certificate of Analysis',
      qaFeature4: 'Quality Documentation',
      qaFeature5: 'Regulatory Compliance',
      qaFeature6: 'Continuous Monitoring',
      
      customMfgTitle: 'Custom Manufacturing',
      customMfgDesc: 'Tailored manufacturing solutions for specialized chemical requirements.',
      customFeature1: 'Contract Manufacturing',
      customFeature2: 'Private Labeling',
      customFeature3: 'Flexible Batch Sizes',
      customFeature4: 'Specialty Formulations',
      customFeature5: 'Packaging Solutions',
      customFeature6: 'Supply Chain Integration',
      
      coreCapabilities: 'Our Core Capabilities',
      coreCapabilitiesDesc: 'Backed by decades of experience and cutting-edge technology',
      advManufacturing: 'Advanced Manufacturing',
      advManufacturingDesc: 'State-of-the-art facilities with modern equipment and automation',
      qualityControl: 'Quality Control',
      qualityControlDesc: 'Rigorous testing and quality assurance at every stage',
      globalReachCap: 'Global Reach',
      globalReachCapDesc: 'Serving customers in over 40 countries worldwide',
      expertTeam: 'Expert Team',
      expertTeamDesc: '50+ R&D scientists and chemical engineering experts',
      
      serviceProcess: 'Our Service Process',
      serviceProcessDesc: 'From initial consultation to ongoing support, we\'re with you every step of the way',
      consultation: 'Consultation',
      consultationDesc: 'Understanding your specific requirements and challenges',
      development: 'Development',
      developmentDesc: 'Custom formulation and solution development',
      testing: 'Testing',
      testingDesc: 'Rigorous testing and quality validation',
      delivery: 'Delivery',
      deliveryDesc: 'Production, delivery, and ongoing support',
      
      readyToStart: 'Ready to Get Started?',
      contactExpertsDesc: 'Contact our team of experts to discuss your chemical solution needs and discover how we can help your business succeed.',
      contactSales: 'Contact Sales Team',
      requestQuote: 'Request Quote',
      
      contactSalesTitle: 'Contact Sales Team',
      fullName: 'Full Name',
      emailAddress: 'Email Address',
      companyName: 'Company',
      phoneNumber: 'Phone Number',
      message: 'Message',
      messagePlaceholder: 'Tell us about your requirements...',
      cancel: 'Cancel',
      sendMessage: 'Send Message',
      sending: 'Sending...',
      
      requestQuoteTitle: 'Request Quote',
      productCategory: 'Product Category',
      productCategoryPlaceholder: 'e.g., Agricultural Fertilizers, Water Treatment, etc.',
      requiredQuantity: 'Required Quantity',
      quantityPlaceholder: 'e.g., 500 kg, 10 tons',
      requiredTimeline: 'Required Timeline',
      timelinePlaceholder: 'e.g., Within 2 weeks',
      productSpecs: 'Product Specifications',
      specsPlaceholder: 'Please provide detailed specifications, purity requirements, packaging preferences, etc.',
      additionalReqs: 'Additional Requirements',
      additionalPlaceholder: 'Any additional information or special requirements...',
      submitQuote: 'Submit Quote Request',
      submitting: 'Submitting...',
      
      messageSent: 'Message Sent Successfully',
      messageSentDesc: 'Our sales team will contact you within 24 hours.',
      quoteSubmitted: 'Quote Request Submitted',
      quoteSubmittedDesc: 'Our team will prepare your quote and respond within 24 hours.',
      errorTitle: 'Error',
      messageFailed: 'Failed to send message. Please try again.',
      quoteFailed: 'Failed to submit quote request. Please try again.',
    },
  },
  
  ar: {
    // Navigation
    home: 'الرئيسية',
    about: 'حولنا',
    services: 'الخدمات',
    products: 'المنتجات',
    contact: 'اتصل بنا',
    shop: {
      title: 'المتجر',
      lowStockWarning: 'لم يتبق سوى {count} قطعة!',
      priceFilter: 'فلتر السعر',
      minPrice: 'الحد الأدنى',
      maxPrice: 'الحد الأقصى',
      inStock: 'متوفر',
      outOfStock: 'غير متوفر',
      volumeDeals: 'عروض الكمية',
      active: 'نشط',
      off: 'خصم',
      more: 'إضافية',
      items: 'قطع',
      max: 'أقصى',
      buy: 'اشترِ',
      catalog: 'الكتالوج',
      addToCart: 'إضافة للسلة',
      addMore: 'إضافة المزيد',
      notAvailable: 'غير متوفر',
      insufficientStock: 'مخزون غير كافٍ',
      maxStockInCart: 'الحد الأقصى من المخزون موجود في السلة',
      onlyXAvailable: 'متوفر فقط {count} وحدة من هذا المنتج',
      onlyXLeft: 'تبقى فقط {count} وحدة!',
      productReviews: 'التقييمات والمراجعات',
      technicalSpecs: 'المواصفات الفنية',
      hideWalletBalance: 'إخفاء رصيد المحفظة',
      showWalletBalance: 'عرض رصيد المحفظة',
      addedToCart: 'تمت الإضافة للسلة',
      addedToCartDesc: 'تمت إضافة {count} وحدة من {product} للسلة',
      welcome: 'مرحباً',
      registrationSuccessful: 'التسجيل ناجح',
      welcomeMessage: 'مرحباً {name}',
      logoutSuccessful: 'تم تسجيل الخروج',
      logoutMessage: 'تم تسجيل الخروج بنجاح',
      error: 'خطأ',
      logoutError: 'خطأ في تسجيل الخروج',
      loginSuccessful: 'تم تسجيل الدخول',
      loginWelcome: 'مرحباً بعودتك! يمكنك الآن إتمام الطلب',
      unit: 'وحدة',
      units: 'وحدات',
      
      // Filters & Sorting
      filters: 'الفلاتر',
      searchProducts: 'البحث عن المنتجات',
      searchProductsPlaceholder: '...ابحث عن المنتجات',
      sortBy: 'ترتيب حسب',
      relevance: 'الأكثر صلة',
      name: 'الاسم',
      categories: 'التصنيفات',
      priceRange: 'نطاق السعر',
      clearAllFilters: 'مسح جميع الفلاتر',
      clearFilters: 'مسح جميع الفلاتر',
      ascending: 'تصاعدي',
      descending: 'تنازلي',
      highToLow: 'من الأعلى للأقل',
      lowToHigh: 'من الأقل للأعلى',
      aToZ: 'أ-ي',
      zToA: 'ي-أ',
      availability: 'التوفر',
      inStockOnly: 'المتوفر فقط',
      newest: 'الأحدث',
      showingProducts: 'عرض',
      page: 'صفحة',
      of: 'من',
      product: 'منتج',
      products: 'منتجات',
    },

    // Blog page
    blog: {
      title: 'مدونة - رؤى صناعة المواد الكيميائية',
      subtitle: 'أحدث المقالات والأدلة والرؤى حول الحلول الكيميائية ومضافات الوقود ومعالجة المياه والمواد الكيميائية الصناعية',
      searchPlaceholder: 'البحث في المقالات حسب العنوان أو المحتوى...',
      allTags: 'جميع العلامات',
      readMore: 'اقرأ المزيد',
      by: 'بواسطة',
      views: 'مشاهدة',
      noPostsFound: 'لم يتم العثور على مقالات',
      noPostsMessage: 'لم نتمكن من العثور على أي مقالات تطابق معاييرك. حاول ضبط البحث أو الفلاتر.',
      loadingPosts: 'جاري تحميل المقالات...',
      previousPage: 'السابق',
      nextPage: 'التالي',
      page: 'صفحة',
      of: 'من',
    },

    // Blog post page
    blogPost: {
      loading: 'جاري تحميل المقال...',
      notFound: 'المقال غير موجود',
      notFoundMessage: 'المقال الذي تبحث عنه غير موجود أو تم حذفه.',
      backToBlog: 'العودة للمدونة',
      shareArticle: 'مشاركة المقال',
      copyLink: 'نسخ الرابط',
      linkCopied: 'تم نسخ الرابط!',
      linkCopiedMessage: 'تم نسخ رابط المقال إلى الحافظة.',
      tableOfContents: 'جدول المحتويات',
      aboutAuthor: 'عن الكاتب',
      relatedPosts: 'مقالات ذات صلة',
      noRelatedPosts: 'لم يتم العثور على مقالات ذات صلة.',
      readingTime: 'وقت القراءة',
      minutes: 'دقيقة',
      publishedOn: 'نشر في',
      updatedOn: 'آخر تحديث',
      previousPost: 'المقال السابق',
      nextPost: 'المقال التالي',
      tags: 'العلامات',
      share: 'مشاركة',
    },

    // Checkout page
    checkout_page: {
      // Page titles & headers
      welcomeTitle: 'مرحباً بك في صفحة الدفع',
      orderPlacedSuccess: 'تم تقديم الطلب بنجاح!',
      orderFailed: 'فشل الطلب',
      orderFailedDesc: 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.',
      
      // Customer Information
      customerInfo: 'معلومات العميل',
      firstName: 'الاسم الأول',
      lastName: 'الاسم الأخير',
      emailAddress: 'عنوان البريد الإلكتروني',
      phoneNumber: 'رقم الهاتف',
      company: 'الشركة',
      required: '*',
      
      // Address Fields
      billingAddress: 'عنوان الفواتير',
      shippingAddress: 'عنوان الشحن',
      fullAddress: 'العنوان الكامل',
      addressLine1: 'سطر العنوان 1',
      addressLine2: 'سطر العنوان 2',
      city: 'المدينة',
      state: 'الولاية/المحافظة',
      province: 'المحافظة',
      postalCode: 'الرمز البريدي',
      country: 'الدولة',
      selectProvince: 'اختر المحافظة',
      selectCity: 'اختر المدينة',
      selectProvinceFirst: 'اختر المحافظة أولاً',
      
      // Recipient Information
      recipientInfo: 'معلومات المستلم',
      recipientName: 'اسم المستلم',
      recipientPhone: 'هاتف المستلم',
      recipientMobile: 'موبايل المستلم',
      recipientAddress: 'عنوان المستلم',
      deliveryAddress: 'عنوان التسليم',
      fullRecipientName: 'الاسم الكامل للمستلم',
      recipientMobilePlaceholder: '09123456789',
      fullDeliveryAddress: 'عنوان التسليم الكامل',
      
      // Second Address
      secondAddress: 'العنوان الثاني',
      secondDeliveryAddress: 'عنوان التسليم الثاني',
      secondFullAddress: 'العنوان الكامل الثاني',
      secondCity: 'المدينة الثانية',
      secondProvince: 'المحافظة الثانية',
      secondPostalCode: 'الرمز البريدي الثاني',
      mobileDeliveryRecipient: 'موبايل المستلم',
      
      // Shipping & Delivery
      shippingMethod: 'طريقة الشحن',
      selectShippingMethod: 'اختر طريقة الشحن',
      smartSelection: 'الاختيار الذكي',
      deliveryMethod: 'طريقة التوصيل',
      estimatedDelivery: 'التسليم المتوقع',
      shippingCost: 'تكلفة الشحن',
      shippingCostLabel: 'تكلفة الشحن:',
      freeShipping: 'مجاني',
      days: 'أيام',
      vehicleType: 'نوع المركبة',
      calculatingBestVehicle: '🔄 جاري حساب أفضل مركبة...',
      smartSelectionDetails: '📋 تفاصيل الاختيار الذكي:',
      selectedVehicleLabel: '🚛 المركبة المختارة:',
      weightCapacity: '⚖️ سعة الوزن:',
      volumeCapacity: '📦 السعة الحجمية:',
      allowedRoutesLabel: '🛣️ الطرق المسموحة:',
      hazardousTransport: '⚠️ نقل المواد الخطرة',
      refrigeratedTransport: '❄️ نقل مبرد',
      fragileHandling: '📱 مناسب للأشياء الهشة',
      freeShippingOver: '✓ شحن مجاني للمشتريات فوق',
      moreForFreeShipping: 'المزيد للشحن المجاني',
      cubicMeter: 'متر مكعب',
      freightCollect: 'الشحن عند التسليم',
      freightCollectDescription: 'سيتم دفع تكلفة الشحن عند التسليم من قبل العميل',
      freightCollectNote: 'لا يتم احتساب تكلفة شحن الآن - الدفع عند التسليم',
      freightCollectSelected: 'الشحن عند التسليم - دفع الشحن عند الاستلام',
      
      // Payment
      paymentInfo: 'معلومات الدفع',
      paymentMethodTitle: 'طريقة الدفع',
      selectPaymentMethod: 'اختر طريقة الدفع *',
      selectPaymentPlaceholder: 'اختر طريقة الدفع',
      bankReceiptUpload: 'تحميل إيصال البنك',
      onlinePaymentMethod: 'الدفع عبر الإنترنت',
      walletPayment: 'الدفع عبر المحفظة',
      walletPaymentTitle: 'رصيد المحفظة',
      useWallet: 'استخدام المحفظة',
      walletBalance: 'الرصيد:',
      walletAmountToUse: 'المبلغ المستخدم من المحفظة (دينار)',
      amountToUse: 'المبلغ المستخدم',
      maxAmount: 'الحد الأقصى',
      maximum: 'الحد الأقصى',
      amountFromWallet: 'المبلغ من المحفظة:',
      remainingAmount: 'المبلغ المتبقي:',
      remainingBalance: 'الرصيد المتبقي',
      availableFunds: 'متوفر',
      orderFullyPaidByWallet: '✓ سيتم دفع الطلب بالكامل من المحفظة - لا حاجة لدفع إضافي',
      noAdditionalPaymentNeeded: 'لا حاجة لدفع إضافي',
      secondaryPayment: 'طريقة الدفع الثانوية',
      selectSecondaryPayment: 'اختر طريقة الدفع الثانوية',
      
      // Order Notes
      orderNotes: 'ملاحظات الطلب',
      orderNotesOptional: 'ملاحظات الطلب (اختياري)',
      orderNotesPlaceholder: 'تعليمات خاصة بالتسليم أو معلومات إضافية...',
      specialInstructions: 'تعليمات خاصة',
      
      // Actions
      placeOrder: 'تأكيد الطلب',
      processingOrder: 'جاري معالجة الطلب...',
      continueToPayment: 'المتابعة للدفع',
      backToShop: 'العودة للمتجر',
      orderNumber: 'رقم الطلب',
      
      // Purchase Order Summary
      purchaseOrder: 'طلب الشراء',
      orderSummary: 'ملخص الطلب',
      productList: 'قائمة المنتجات',
      subtotal: 'المجموع الفرعي',
      totalWeight: 'الوزن الكلي',
      shipping: 'الشحن',
      tax: 'الضريبة',
      discount: 'الخصم',
      walletUsed: 'المحفظة المستخدمة',
      total: 'الإجمالي',
      minimize: 'تصغير',
      
      // Cart Management
      cartManagement: 'إدارة السلة',
      removeItem: 'إزالة المنتج',
      updateQuantity: 'تحديث الكمية',
      emptyCart: 'سلة فارغة',
      
      // Validation Messages
      validEmail: 'يرجى إدخال عنوان بريد إلكتروني صالح',
      minCharacters: 'يجب أن يكون على الأقل {min} حرفاً',
      minTwoCharacters: 'يجب أن يكون على الأقل حرفين',
      validPhone: 'يرجى إدخال رقم هاتف صالح',
      addressRequired: 'العنوان مطلوب',
      cityRequired: 'المدينة مطلوبة',
      stateRequired: 'الولاية/المحافظة مطلوبة',
      postalRequired: 'الرمز البريدي مطلوب',
      countryRequired: 'الدولة مطلوبة',
      selectShipping: 'يرجى اختيار طريقة الشحن',
      selectPayment: 'يرجى اختيار طريقة الدفع',
      
      // Units & Measurements
      kg: 'كغ',
      ton: 'طن',
      liter: 'لتر',
      piece: 'قطعة',
      iqd: 'دينار',
      usd: 'دولار',
      
      // New translations for checkout.tsx
      deliveryTitle: 'عنوان التسليم',
      useSecondaryAddress: 'استخدام العنوان الثانوي',
      secondaryAddressSelected: 'تم اختيار العنوان الثاني:',
      cityLabel: 'المدينة',
      recipientInfoTitle: 'معلومات المستلم',
      recipientInfoLabel: 'معلومات المستلم',
      recipientInfoNote: 'إذا كان المستلم شخصاً مختلفاً عن العميل، املأ هذه الحقول',
      recipientNameLabel: 'اسم المستلم',
      recipientNamePlaceholder: 'الاسم الكامل للمستلم',
      recipientPhoneLabel: 'رقم موبايل المستلم',
      recipientAddressLabel: 'عنوان التسليم',
      recipientAddressPlaceholder: 'عنوان التسليم الكامل',
      secondAddressOrMobile: 'عنوان ثاني أو رقم موبايل مختلف',
      secondAddressNote: 'إذا كنت بحاجة إلى عنوان أو رقم موبايل مختلف للتسليم، املأ هذا القسم',
      secondAddressOptional: 'العنوان الثاني (اختياري)',
      hideButton: 'إخفاء',
      addSecondAddress: 'إضافة عنوان ثاني',
      secondFullAddressLabel: 'العنوان الكامل الثاني',
      secondFullAddressPlaceholder: 'عنوان التسليم الكامل الثاني',
      fullAddressLabel: 'العنوان الكامل',
      secondAddressDeliveryPlaceholder: 'العنوان الثاني لتسليم المنتجات...',
      provinceLabel: 'المحافظة',
      selectProvincePlaceholder: 'اختر المحافظة',
      citySelectLabel: 'المدينة',
      selectCityPlaceholder: 'اختر المدينة',
      postalCodeLabel: 'الرمز البريدي',
      postalCodePlaceholder: 'الرمز البريدي',
      differentMobileOptional: 'رقم موبايل مختلف (اختياري)',
      differentMobileLabel: 'رقم موبايل مختلف',
      addDifferentNumber: 'إضافة رقم مختلف',
      recipientMobileLabel: 'رقم موبايل المستلم',
      thisNumberForDelivery: 'سيتم استخدام هذا الرقم للاتصال بالتسليم',
      mobileForDeliveryContact: 'سيتم استخدام هذا الرقم للاتصال بالتسليم',
      smsDeliveryConfirmation: 'سيتم استخدام هذا الرقم لتأكيد التسليم عبر الرسائل القصيرة',
      postalCodeOptional: 'الرمز البريدي (اختياري)',
      shippingMethodTitle: 'طريقة الشحن',
      selectShippingLabel: 'اختر طريقة الشحن * (الاختيار الذكي)',
      selectShippingPlaceholder: 'اختر طريقة الشحن',
      smartSelectionNote: 'ذكي',
      destination: 'الوجهة:',
      weight: 'الوزن:',
      basePrice: 'السعر الأساسي:',
      distance: 'المسافة:',
      autoCalculate: 'حساب تلقائي',
      specifyDestinationCity: '📍 الرجاء تحديد مدينة الوجهة',
      addProductsToCart: '⚖️ أضف منتجات إلى السلة',
      erbilCity: 'أربيل',
      heavyTruck: 'ثقيل',
      flammableSuffix: ' (مواد قابلة للاشتعال)',
      warehouseNoteActive: 'العنوان النشط:',
      warehouseNoteSecond: 'العنوان الثاني',
      warehouseNoteCRM: 'عنوان CRM',
      warehouseNotePhone: 'الهاتف النشط:',
      warehouseNoteDifferentMobile: 'موبايل مختلف',
      warehouseNoteCRMPhone: 'هاتف CRM',
      orderCodeAfterCheckout: 'سيتم تقديم رمز الطلب بعد إتمام الدفع',
      productCode: 'رمز المنتج:',
      removeFromCart: 'إزالة من السلة',
      removedFromCartMsg: 'تمت الإزالة من السلة',
      defaultAddressInactive: 'العنوان الافتراضي (غير نشط)',
      defaultAddressCRM: 'العنوان الافتراضي (CRM)',
      provinceField: 'المحافظة:',
      cityField: 'المدينة:',
      phoneField: 'الهاتف:',
      unknown: 'غير معروف',
      secondAddressOrDifferentMobile: 'عنوان ثاني أو رقم موبايل مختلف',
      
      // Order Summary Section
      orderSummaryTitle: 'ملخص الطلب',
      itemCount: 'عدد العناصر:',
      approximateWeight: 'الوزن التقريبي:',
      defaultDeliveryAddress: 'عنوان التسليم الافتراضي',
      activeDeliveryInfo: 'عنوان ومعلومات التسليم النشطة',
      draggableCardMessage: 'بطاقة أمر الشراء قابلة للسحب الآن! انقر واسحب.',
      smartVehicleSelectionLabel: 'المركبة المحددة (ذكية)',
      
      // Draggable Card
      dragging: '🖱️ جاري السحب...',
      draggable: '🖱️ قابل للسحب',
      dragToMove: 'انقر واسحب لنقل البطاقة!',
      
      // Order Details
      orderContainsItems: 'يحتوي طلب الشراء الخاص بك على {count} عناصر',
      items: 'عناصر',
      orderDate: 'تاريخ الطلب:',
      
      // Vehicle Selection
      vehicleTypeLabel: 'نوع المركبة:',
      weightCapacityLabel: 'سعة الوزن:',
      destinationLabel: 'الوجهة:',
      baseCostLabel: 'التكلفة الأساسية:',
      distanceFromErbil: 'المسافة من أربيل:',
      kilometer: 'كيلومترات',
      autoCalculation: 'حساب تلقائي بناءً على الوزن والوجهة',
      
      // Active Address Info
      activeAddress: 'العنوان النشط:',
      recipientPhoneNumber: 'رقم هاتف المستلم:',
      infoWillBeUsed: '✅ سيتم استخدام هذه المعلومات لتسليم الطلب',
      addressNotUsed: '⚠️ تم تحديد عنوان أو رقم جديد - لن يتم استخدام هذا العنوان',
      defaultAddressNote: '💡 سيتم استخدام هذا العنوان كعنوان التسليم الافتراضي. للتغيير، أدخل عنوانًا ثانيًا أو رقم موبايل مختلف.',
      
      // Form Labels
      secondAddressTitle: 'عنوان ثاني أو رقم موبايل مختلف',
      differentMobileNumberLabel: 'رقم موبايل مختلف',
      
      // Actions
      continueShoppingBtn: 'متابعة التسوق',
      clearCartBtn: 'مسح السلة',
      cartClearedTitle: 'تم مسح السلة',
      allProductsRemoved: 'تمت إزالة جميع المنتجات من السلة',
      
      // Payment Summary
      paymentSummaryTitle: 'ملخص الدفع',
      itemsTotal: 'إجمالي العناصر:',
      shippingCostSummary: 'تكلفة الشحن:',
      free: 'مجاني',
      valueAddedTax: 'ضريبة القيمة المضافة',
      valueAddedDuty: 'رسوم القيمة المضافة',
      walletUsedSummary: 'المحفظة المستخدمة:',
      totalPayable: 'إجمالي المبلغ المستحق:',
      freeShippingEligible: '🎉 أنت مؤهل للشحن المجاني!',
      fullyPaidByWallet: '💳 سيتم دفع هذا الطلب بالكامل من محفظتك',
    },

    // Address Selector Component
    address_selector: {
      // Page titles
      deliveryAddressTitle: 'عنوان التسليم',
      selectAddressDescription: 'اختر العنوان لتسليم الطلب',
      
      // Buttons
      addNewAddress: 'إضافة عنوان جديد',
      addFirstAddress: 'إضافة العنوان الأول',
      updateButton: 'تحديث',
      cancelButton: 'إلغاء',
      setAsDefault: 'تعيين كافتراضي',
      getLocationButton: 'الحصول على الموقع الحالي',
      gettingLocation: 'جاري الحصول على الموقع...',
      
      // Dialog titles
      editAddressTitle: 'تعديل العنوان',
      addAddressTitle: 'إضافة عنوان جديد',
      enterAddressInfo: 'أدخل معلومات العنوان',
      
      // Form labels
      addressTitle: 'عنوان العنوان',
      addressTitlePlaceholder: 'مثال: المنزل، المكتب',
      recipientNameLabel: 'اسم المستلم',
      recipientNamePlaceholder: 'الاسم الكامل للمستلم',
      recipientNameNote: 'الاسم معبأ مسبقاً من حسابك',
      fullAddressLabel: 'العنوان الكامل',
      fullAddressPlaceholder: 'أدخل عنوانك الكامل',
      cityLabel: 'المدينة',
      postalCodeLabel: 'الرمز البريدي',
      postalCodePlaceholder: 'اختياري',
      gpsLocationLabel: 'موقع GPS',
      latitudeLabel: 'خط العرض:',
      longitudeLabel: 'خط الطول:',
      accuracyLabel: 'الدقة:',
      metersUnit: 'متر',
      
      // Status messages
      defaultBadge: 'افتراضي',
      recipientLabel: 'المستلم:',
      noAddressFound: 'لم يتم العثور على عناوين',
      loadingAddresses: 'جاري التحميل...',
      
      // Toast messages
      locationReceived: 'تم استلام الموقع',
      locationReceivedDesc: 'تم تسجيل موقعك الحالي بدقة {accuracy} متر',
      locationError: 'خطأ في الموقع',
      locationPermissionDenied: 'تم رفض الوصول إلى الموقع. يرجى تمكين الوصول في إعدادات المتصفح',
      locationUnavailable: 'الموقع غير متاح',
      locationTimeout: 'انتهت مهلة طلب الموقع',
      browserNotSupported: 'متصفحك لا يدعم تحديد الموقع الجغرافي',
      addressCreated: 'تمت إضافة عنوان جديد بنجاح',
      addressCreateError: 'خطأ في إنشاء العنوان',
      addressUpdated: 'تم تحديث العنوان بنجاح',
      addressUpdateError: 'خطأ في تحديث العنوان',
      addressDeleted: 'تم حذف العنوان بنجاح',
      addressDeleteError: 'خطأ في حذف العنوان',
      defaultAddressSet: 'تم تعيين العنوان الافتراضي',
      defaultAddressError: 'خطأ في تعيين العنوان الافتراضي',
      fetchAddressesError: 'خطأ في جلب العناوين',
      fetchCustomerInfoError: 'خطأ في جلب معلومات العميل',
      
      // Countries
      defaultCountry: 'العراق',
    },
    
    // Common actions
    login: 'تسجيل الدخول',
    logout: 'تسجيل الخروج',
    register: 'إنشاء حساب',
    submit: 'إرسال',
    cancel: 'إلغاء',
    save: 'حفظ',
    edit: 'تحرير',
    delete: 'حذف',
    search: 'بحث',
    loading: 'جاري التحميل...',
    
    // Product related
    addToCart: 'أضف إلى السلة',
    viewDetails: 'عرض التفاصيل',
    price: 'السعر',
    quantity: 'الكمية',
    category: 'الفئة',
    inStock: 'متوفر',
    outOfStock: 'غير متوفر',
    
    // Cart and checkout
    cart: 'السلة',
    checkout: 'الدفع',
    total: 'المجموع',
    subtotal: 'المجموع الفرعي',
    shipping: 'الشحن',
    orderSummary: 'ملخص الطلب',
    placeOrder: 'تأكيد الطلب',
    
    // User account
    myAccount: 'حسابي',
    myOrders: 'طلباتي',
    profile: 'الملف الشخصي',
    wallet: 'المحفظة',
    orderHistory: 'تاريخ الطلبات',
    
    // Product Management
    productManagement: {
      // Validation messages
      categoryRequired: 'فئة المنتج مطلوبة',
      barcodeRequired: 'حقل الباركود مطلوب',
      unitPriceRequired: 'سعر الوحدة مطلوب',
      stockRequired: 'كمية المخزون مطلوبة',
      minStockRequired: 'الحد الأدنى للمخزون مطلوب',
      maxStockRequired: 'الحد الأقصى للمخزون مطلوب',
      netWeightRequired: 'الوزن الصافي مطلوب',
      grossWeightRequired: 'الوزن الإجمالي مطلوب',
      grossWeightMinError: 'يجب أن يكون الوزن الإجمالي أكبر من أو يساوي الوزن الصافي',
      minMaxStockError: 'لا يمكن أن يكون الحد الأدنى للمخزون أكبر من الحد الأقصى',
      newBatchNumberRequired: 'رقم الدفعة مطلوب لإنشاء دفعة جديدة',
      
      // Toast messages
      batchDeleted: 'تم حذف الدفعة',
      batchDeletedDesc: 'تم حذف الدفعة "{batchNumber}" بنجاح',
      batchDeleteError: 'خطأ في حذف الدفعة',
      batchDeleteErrorDesc: 'لا يمكن حذف الدفعة',
      productUpdated: 'تم تحديث المنتج بنجاح',
      productUpdateError: 'فشل تحديث المنتج',
      duplicateSKU: 'رمز SKU مكرر، يرجى إدخال رمز جديد',
      productDeleted: 'تم حذف المنتج بنجاح وإزالته من المتجر',
      productDeleteError: 'فشل حذف المنتج',
      enterNameCategory: 'يرجى إدخال اسم المنتج والفئة',
      imageUploaded: 'تم رفع الصورة {index} بنجاح',
      imageUploadError: 'فشل رفع الصورة',
      barcodeGenerated: 'تم إنشاء الباركود تلقائياً',
      barcodeGeneratedDesc: 'تم إنشاء باركود EAN-13: {barcode}',
      confirmBatchDelete: 'هل أنت متأكد أنك تريد حذف الدفعة "{batchNumber}"؟',
      
      // Form labels and fields
      editProduct: 'تحرير معلومات المنتج الحالي',
      addNewProduct: 'إضافة منتج جديد إلى الكتالوج',
      nonChemicalProduct: 'منتج غير كيميائي',
      nonChemicalDesc: 'منتج غير كيميائي',
      flammableProduct: 'منتج قابل للاشتعال',
      flammableDesc: 'منتج قابل للاشتعال',
      baseInfo: 'المعلومات الأساسية للمنتج',
      productName: 'اسم المنتج *',
      productNamePlaceholder: 'أدخل اسم المنتج',
      productNameHelp: 'أدخل الاسم الرئيسي للمنتج',
      categoryLabel: 'الفئة *',
      categoryPlaceholder: 'اختر الفئة',
      categoryHelp: 'فئة المنتج للتصنيف والبحث الأفضل',
      technicalName: 'الاسم الفني / الدرجة',
      technicalNamePlaceholder: 'الاسم الفني أو درجة المنتج',
      technicalNameHelp: 'الاسم الفني أو درجة المنتج للعرض على بطاقة المبيعات',
      description: 'الوصف',
      descriptionPlaceholder: 'وصف المنتج...',
      descriptionHelp: 'وصف كامل عن المنتج واستخداماته ومميزاته',
      identificationPricing: 'التعريف والتسعير',
      sku: 'رمز SKU',
      skuPlaceholder: 'رمز المنتج أو استخدم AI',
      skuPlaceholderView: 'رمز المنتج (عرض فقط)',
      skuHelp: 'رمز منتج فريد للتعريف في النظام',
      skuHelpView: 'لا يمكن تغيير رمز المنتج الفريد',
      barcode: 'الباركود',
      barcodePlaceholder: 'باركود المنتج',
      barcodeHelp: 'باركود المنتج للمسح والمبيعات',
      unitPrice: 'سعر الوحدة (دينار) *',
      unitPricePlaceholder: '0',
      unitPriceHelp: 'سعر بيع المنتج لكل وحدة',
      stock: 'المخزون *',
      stockPlaceholder: '0',
      stockPlaceholderEdit: 'فقط في تحرير المنتج',
      stockHelp: 'كمية المنتج المتاحة في المستودع',
      inventoryAddition: 'إضافة إلى المخزون',
      inventoryAdditionPlaceholder: '0',
      batchSelection: 'اختر الدفعة للتحرير',
      batchSelectionPlaceholder: 'اختر الدفعة...',
      batchOption: '📦 دفعة: {batchNumber} - مخزون: {stock}',
      addNewBatch: '➕ إضافة دفعة جديدة',
      batchesAvailable: '{count} دفعات متاحة للباركود {barcode}',
      selectNewBatch: 'لإضافة دفعة جديدة، اختر "➕ إضافة دفعة جديدة"',
      currentBatchNumber: 'رقم الدفعة الحالية',
      newBatchNumber: 'رقم الدفعة الجديدة',
      batchNumberPlaceholder: 'رقم الدفعة',
      batchNumberHelp: 'رقم الدفعة الجديدة للكتالوج',
      batchNumberHelpCurrent: 'رقم الدفعة الحالية - سيتم إضافة المخزون إلى هذه الدفعة',
      stockWillBeAdded: '✅ سيتم إضافة المخزون إلى هذه الدفعة',
      minStock: 'الحد الأدنى للمخزون *',
      minStockPlaceholder: '0',
      minStockHelp: 'الحد الأدنى لمستوى المخزون للتنبيه بالنقص',
      maxStock: 'الحد الأقصى للمخزون *',
      maxStockPlaceholder: '0',
      maxStockHelp: 'الحد الأقصى لسعة التخزين في المستودع للمنتج',
      weightRow: 'صف الوزن',
      netWeight: 'الوزن الصافي *',
      netWeightPlaceholder: '0',
      netWeightHelp: 'وزن المنتج الصافي بدون التعبئة',
      netWeightHelpView: 'لا يمكن تغيير الوزن إلا عند إنشاء منتج جديد',
      grossWeight: 'الوزن الإجمالي',
      grossWeightPlaceholder: '0',
      grossWeightHelp: 'الوزن الإجمالي للمنتج مع التعبئة (للنقل)',
      grossWeightHelpView: 'لا يمكن تغيير الوزن إلا عند إنشاء منتج جديد',
      weightUnit: 'الوحدة',
      syncWithShop: 'العرض في المتجر الإلكتروني',
      showWhenOutOfStock: 'العرض حتى عند نفاد المخزون',
      productImages: 'صور المنتج (بحد أقصى 3 صور)',
      productImagesFromMain: 'صور المنتج (من المنتج الرئيسي)',
      imagesHelp: 'حد أقصى 3 صور للمنتج للعرض في الكتالوج والمتجر. يدعم JPG, PNG, GIF - بحد أقصى 2MB',
      imagesHelpBatch: 'تم جلب الصور من المنتج الرئيسي. يمكنك تغييرها إذا لزم الأمر.',
      selectPrimaryImage: 'اختر الصورة الرئيسية:',
      selectPrimaryImageHelp: 'انقر على زر الدائرة في أسفل يسار كل صورة (الصورة المحددة: {index})',
      selectPrimaryImageHelpDB: 'تم جلب الصور من قاعدة البيانات وقابلة للتعديل (الصورة الرئيسية: {index})',
      imageNumber: 'الصورة {index}',
      imagePreview: 'معاينة الصورة {index}',
      setPrimaryImage: 'تعيين كصورة رئيسية {selected}',
      selectImage: 'اختر صورة',
      imageUrlPlaceholder: 'رابط الصورة {index}',
      productCatalog: 'كتالوج المنتج (PDF)',
      catalogHelp: 'كتالوج أو كتيب المنتج بصيغة PDF للمعلومات الإضافية',
      catalogFile: 'ملف الكتالوج',
      selectCatalog: 'اختر الكتالوج',
      catalogName: 'اسم ملف الكتالوج',
      catalogNamePlaceholder: 'catalog.pdf',
      showToCustomers: 'عرض للعملاء',
      catalogURL: 'رابط الكتالوج',
      catalogURLPlaceholder: 'رابط الكتالوج',
      msds: 'MSDS',
      msdsHelp: 'ورقة بيانات سلامة المواد للمعلومات الأمنية',
      msdsFile: 'ملف MSDS',
      selectMSDS: 'اختر MSDS',
      msdsName: 'اسم ملف MSDS',
      msdsNamePlaceholder: 'msds.pdf',
      msdsURL: 'رابط MSDS',
      msdsURLPlaceholder: 'رابط MSDS',
      updateProduct: 'تحديث المنتج',
      addProduct: 'إضافة منتج',
      confirmDelete: 'تأكيد حذف المنتج',
      confirmDeleteDesc: 'هل أنت متأكد أنك تريد حذف المنتج "{name}"؟',
      confirmDeleteWarning: 'هذا الإجراء لا رجعة فيه وسيتم حذف المنتج من كل من الكتالوج والمتجر.',
      cancel: 'إلغاء',
      deleteProduct: 'حذف المنتج',
      activeBatch: 'الدفعة النشطة (قيد البيع):',
      fifoSystem: 'نظام FIFO - أقدم دفعة مع مخزون',
      totalStock: 'إجمالي المخزون: {stock}',
      onlyBatchesWithStock: 'فقط الدفعات مع المخزون',
      deleteBatch: 'حذف الدفعة',
      netWeightLabel: 'الوزن الصافي:',
      grossWeightLabel: 'الوزن الإجمالي:',
      weightLabel: 'الوزن:',
      
      // Additional UI elements
      hideFromShop: 'إخفاء من المتجر',
      showInShop: 'عرض في المتجر',
      manageBatches: 'إدارة الدفعات',
      sellingNow: 'قيد البيع',
      inQueue: 'في الانتظار',
      clickToOpenCatalog: 'انقر لفتح الكتالوج',
      clickToOpenMSDS: 'انقر لفتح MSDS',
      manualMode: 'يدوي',
      currencyIQD: 'دينار عراقي (IQD)',
      currencyUSD: 'دولار أمريكي (USD)',
      currencyEUR: 'يورو (EUR)',
      currencyTRY: 'ليرة تركية (TRY)',
      currentStock: 'المخزون الحالي',
      addStock: 'إضافة مخزون',
      onlyForEdit: 'تحرير فقط',
      editOnly: 'فقط في تحرير المنتج الموجود',
      editOnlyPlaceholder: 'فقط في تحرير المنتج الموجود',
      fileManagement: 'إدارة الملفات والوثائق',
      uploadingFile: 'جاري الرفع...',
      viewCatalog: 'عرض الكتالوج',
      uploadCatalog: 'رفع الكتالوج',
      viewMSDS: 'عرض MSDS',
      uploadMSDS: 'رفع MSDS',
      imageUrlsLabel: 'روابط الصور',
      primaryImageLabel: 'رئيسية',
      productImagesMain: 'صور المنتج (من المنتج الرئيسي)',
      editableIfNeeded: 'قابل للتغيير عند الحاجة',
      imagesFetchedFromMain: 'تم جلب الصور من المنتج الرئيسي. يمكنك تغييرها إذا لزم الأمر.',
      imagesFetchedHelp: 'حد أقصى 3 صور للمنتج للعرض في الكتالوج والمتجر. يدعم JPG, PNG, GIF - بحد أقصى 2MB',
      imagesFetchedFromDB: 'تم جلب الصور من قاعدة البيانات وقابلة للتعديل (الصورة الرئيسية: {index})',
      clickCircleButton: 'انقر على زر الدائرة في أسفل يسار كل صورة (الصورة المحددة: {index})',
      uploadImage: 'جاري الرفع...',
      clickToSelectPDF: 'انقر لاختيار {type} PDF',
      onlyPDF: 'ملفات PDF فقط',
      incompleteInfo: '⚠️ معلومات ناقصة',
      enterNameCategoryFirst: 'الرجاء إدخال اسم المنتج والفئة أولاً',
      standard13Barcode: 'باركود قياسي 13 رقم',
      manualInputPreventsAuto: 'الإدخال اليدوي يمنع التوليد التلقائي',
      barcode13Placeholder: 'باركود 13 رقم',
      pricePerUnit: 'السعر لكل وحدة بالعملة المختارة',
      stockManagement: 'إدارة المخزون والوزن',
      stockRow: 'صف المخزون',
      stockNotEditable: 'مخزون المنتج الحالي في المستودع (غير قابل للتغيير مباشرة)',
      initialStockHelp: 'موجودی اولیه برای ثبت این محصول جدید',
      stockAdditionHelp: 'كمية المخزون التي تريد إضافتها إلى المستودع (فقط في تحرير المنتج الموجود)',
      chemical: 'كيميائي',
      allBatches: 'جميع الدفعات',
      unit: 'وحدة',
      units: 'وحدات',
      editable: 'قابل للتعديل',
      imagesUploadSection: 'رفع الصور',
      selectPrimaryImageTitle: 'اختر الصورة الرئيسية',
      imageFromMain: 'صور المنتج (من المنتج الرئيسي)',
      maxThreeImages: 'بحد أقصى 3 صور',
      catalogActionsButtons: 'أزرار عمل الكتالوج',
      msdsSection: 'قسم MSDS',
      msdsActionsButtons: 'أزرار عمل MSDS',
      msdsSettings: 'إعدادات MSDS',
      catalogSettings: 'إعدادات الكتالوج',
      showToCustomersLabel: 'عرض للعملاء',
      showToCustomersHelp: '{type} قابل للتنزيل في المتجر',
      hidden: 'مخفي',
      forChemicalOnly: 'للمنتجات الكيميائية فقط',
      newBatchField: 'حقل رقم الدفعة الجديدة',
      selectBatchForEdit: 'اختر الدفعة للتحرير',
      selectBatchPlaceholderText: 'اختر الدفعة...',
      allBatchesCount: 'جميع الدفعات ({count}):',
      totalStockLabel: 'إجمالي المخزون: {stock}',
      onlyWithStock: 'فقط الدفعات مع المخزون',
      batch: 'دفعة',
      batchNum: 'دفعة {number}',
      initialFixedValue: 'قيمة ثابتة أولية',
      fixedValue: 'قيمة ثابتة',
      selectWeightUnit: 'اختر الوحدة',
      weightUnitKg: 'كيلوغرام (kg)',
      weightUnitG: 'غرام (g)',
      weightUnitLb: 'باوند (lb)',
      weightUnitOz: 'أونصة (oz)',
      weightUnitT: 'طن (t)',
      tagsLabel: 'علامات المنتج',
      tagsHelp: 'افصل العلامات بفاصلة. هذه العلامات ستظهر في المتجر',
      tagsPlaceholder: 'مثال: كيميائي, صناعي, منظف',
      showWhenOutOfStockDesc: 'عرض المنتج حتى عند نفاد الكمية',
      clickToSelectCatalog: 'انقر لاختيار ملف PDF للكتالوج',
      clickToSelectMSDS: 'انقر لاختيار ملف PDF لـ MSDS',
      catalogDownloadable: 'الكتالوج قابل للتنزيل في المتجر',
      msdsDownloadable: 'MSDS قابل للتنزيل في المتجر',
      inStock: 'متوفر في المخزون',
      lowStock: 'المخزون منخفض',
      outOfStock: 'نفذ من المخزون',
      activeFilters: 'الفلاتر النشطة:',
      statusLabel: 'الحالة',
      visibilityLabel: 'الرؤية',
      hiddenProducts: 'المنتجات المخفية',
      visibleProducts: 'المنتجات الظاهرة',
      searchLabel: 'البحث',
      clearAll: 'مسح الكل',
      totalProducts: 'إجمالي المنتجات',
      fileTooLarge: 'حجم الملف كبير جداً',
      fileTooLargeDesc: 'يجب أن يكون حجم الملف أقل من 2 ميجابايت. يرجى ضغط الملف أو تصغير حجمه.',
      invalidFormat: 'تنسيق غير صحيح',
      invalidImageFormat: 'فقط صور JPEG و PNG و WebP مسموح بها للعرض الأمثل للعملاء.',
      invalidPDFFormat: 'فقط ملفات PDF مسموح بها للمستندات.',
      uploadError: 'خطأ في الرفع',
      uploadFailed: 'فشل رفع الملف',
      success: 'نجح',
      imageUploadedSuccess: 'تم رفع الصورة بنجاح - محسّنة لعرض العملاء',
      technicalSpecifications: 'المواصفات الفنية',
      technicalSpecificationsPlaceholder: 'أدخل المواصفات الفنية كـ JSON أو نص...',
      technicalSpecificationsHelp: 'التفاصيل الفنية للمنتج المرئية للعملاء في المتجر',
      productFeatures: 'ميزات المنتج',
      productFeaturesPlaceholder: 'أدخل ميزات المنتج (واحدة في كل سطر)',
      productFeaturesHelp: 'الميزات الرئيسية المرئية للعملاء - واحدة في كل سطر',
      productApplications: 'تطبيقات المنتج',
      productApplicationsPlaceholder: 'أدخل تطبيقات المنتج (واحدة في كل سطر)',
      productApplicationsHelp: 'الاستخدامات والتطبيقات الشائعة - واحدة في كل سطر',
      batchInfoNotAvailable: 'معلومات الدفعة غير متاحة',
      displayMode: 'وضع عرض المنتج',
      displayModeHelp: 'اختر كيف سيشاهد العملاء هذا المنتج في المتجر',
      displayModeImages: 'معرض الصور (3 صور)',
      displayMode3D: 'نموذج ثلاثي الأبعاد تفاعلي',
      model3dFile: 'ملف النموذج ثلاثي الأبعاد',
      uploadModel3d: 'رفع نموذج ثلاثي الأبعاد',
      viewModel3d: 'عرض النموذج ثلاثي الأبعاد',
      deleteModel3d: 'حذف النموذج ثلاثي الأبعاد',
      model3dHelp: 'ارفع ملف GLB أو GLTF لعرض المنتج بشكل تفاعلي ثلاثي الأبعاد (أقصى حجم 10 ميجابايت)',
      model3dFormats: 'التنسيقات المدعومة: GLB, GLTF',
      model3dUploaded: 'تم رفع النموذج ثلاثي الأبعاد بنجاح',
      model3dDeleted: 'تم حذف النموذج ثلاثي الأبعاد بنجاح',
      invalidModel3dFormat: 'يُسمح فقط بملفات GLB و GLTF للنماذج ثلاثية الأبعاد',
      model3dTooLarge: 'يجب أن يكون حجم ملف النموذج ثلاثي الأبعاد أقل من 10 ميجابايت',
      rotate3dModel: 'اسحب للتدوير',
      zoom3dModel: 'قم بالتمرير للتكبير',
      loading3dModel: 'جاري تحميل النموذج ثلاثي الأبعاد...',
      error3dModel: 'خطأ في تحميل النموذج ثلاثي الأبعاد',
      pageTitle: 'إدارة المنتجات',
      pageSubtitle: 'إدارة المنتجات ضمن خمس فئات',
      backToAdmin: 'العودة إلى الإدارة',
      logout: 'تسجيل الخروج',
      searchPlaceholder: 'البحث بالاسم أو الباركود أو SKU...',
      allProducts: 'كل المنتجات',
      noProductsFound: 'لم يتم العثور على منتجات',
      noProductsAvailable: 'لا توجد منتجات متاحة',
      noProductsMatch: 'لا توجد منتجات تطابق "{query}". جرّب البحث بالاسم أو الباركود أو SKU.',
      addFirstProduct: 'أضف منتجك الأول للبدء.',
      clearSearch: 'مسح البحث',
      discontinued: 'متوقف',
      unknown: 'غير معروف',
      noBarcode: 'غير متوفر',
      variant: 'متغير',
      companyLabel: 'الشركة',
      temperatureLabel: 'درجة حرارة النقل:',
      temperatureNone: 'بدون قيود حرارية',
      temperatureFrozen: 'مجمد: ‎-18°C إلى 0°C',
      temperatureChilled: 'مبرد: ‎+2°C إلى +8°C',
      temperatureCool: 'بارد: ‎+8°C إلى +15°C',
      temperatureDry: 'درجة حرارة الغرفة: 15°C إلى 25°C',
      assignVendor: 'تعيين إلى مورد (اختياري)',
      assignVendorHelp: 'عيّن هذا المنتج اختيارياً إلى مورد في السوق',
      selectVendor: 'اختر المورد (اختياري)',
      noVendor: 'لا يوجد مورد (منتج الشركة)',
      fileTooLargeTitle: 'الملف كبير جداً',
      imageTooLargeDesc: 'يجب أن يكون حجم الصورة أقل من 2 ميجابايت. يرجى ضغط الصورة أو تغيير حجمها.',
      invalidImageFormatDesc: 'يسمح فقط بصور JPEG وPNG وWebP لعرضها الأمثل للعملاء.',
      imageUploadSuccess: 'تم رفع الصورة بنجاح وتحسينها لعرض العملاء',
      uploadErrorTitle: 'خطأ في الرفع',
      imageUploadFailed: 'فشل رفع الصورة',
      invalidImageFormatsDesc: 'يسمح فقط بصور JPEG وPNG وWEBP وGIF.',
      removeImageError: 'فشل حذف صورة المنتج',
      imageFileTypes: 'JPG، PNG، WEBP، GIF',
      model3dFileTypes: 'ملفات ‎.glb / .gltf فقط',
      removeCatalogError: 'فشل حذف ملف الكتالوج',
      removeMsdsError: 'فشل حذف ملف MSDS',
      catalogFilename: 'catalog.pdf',
      msdsFilename: 'msds.pdf',
      selected: 'محدد',
      model3dPreview: 'معاينة النموذج ثلاثي الأبعاد',
      aiGenerate: 'الذكاء الاصطناعي',
    },
    
    // Batch Management
    batchManagement: {
      pageTitle: 'إدارة الدفعات (FIFO)',
      pageSubtitle: 'إدارة دفعات المنتجات بنظام FIFO',
      searchBatches: 'البحث عن الدفعات',
      searchDescription: 'أدخل الباركود لعرض جميع الدفعات',
      barcodeLabel: 'باركود المنتج',
      barcodePlaceholder: 'مثال: 8649677123456',
      searchButton: 'بحث',
      currentSellingBatch: 'الدفعة النشطة للبيع (LIFO)',
      currentSellingDescription: 'هذه الدفعة مختارة حالياً للبيع',
      batchNumber: 'رقم الدفعة',
      stock: 'المخزون',
      stockUnits: 'وحدة',
      productionDate: 'تاريخ الإنتاج',
      activeStatus: 'نشط',
      totalBatches: 'عدد الدفعات',
      totalStock: 'إجمالي المخزون',
      barcode: 'الباركود',
      emptyBatches: 'الدفعات الفارغة',
      batchList: 'قائمة الدفعات (FIFO)',
      batchListDescription: 'تُباع الدفعات القديمة أولاً (First In, First Out)',
      soldOut: 'نفذت الكمية',
      selling: 'قيد البيع',
      waiting: 'في الانتظار',
      price: 'السعر',
      netWeight: 'الوزن الصافي',
      batchNotFound: 'لم يتم العثور على دفعة',
      noBatchesMessage: 'لا توجد دفعات مسجلة للباركود',
      loadingBatches: 'جاري تحميل معلومات الدفعات...',
    },
    
    // Wallet specific
    walletTitle: 'محفظة العميل',
    walletSubtitle: 'إدارة رصيد حسابك والمعاملات',
    currentBalance: 'الرصيد الحالي',
    creditLimit: 'الحد الائتماني',
    status: 'الحالة',
    lastActivity: 'آخر نشاط',
    addFunds: 'إضافة أموال',
    transactions: 'المعاملات',
    rechargeRequests: 'طلبات الشحن',
    amount: 'المبلغ',
    currency: 'العملة',
    paymentMethod: 'طريقة الدفع',
    paymentReference: 'مرجع الدفع',
    notes: 'ملاحظات',
    pending: 'معلق',
    completed: 'مكتمل',
    rejected: 'مرفوض',
    active: 'نشط',
    inactive: 'غير نشط',
    credit: 'إيداع',
    debit: 'سحب',
    type: 'النوع',
    description: 'الوصف',
    date: 'التاريخ',
    requestNumber: 'رقم الطلب',
    totalSpent: 'إجمالي الإنفاق',
    totalRecharged: 'إجمالي الشحن',
    noTransactions: 'لا توجد معاملات',
    noRechargeRequests: 'لا توجد طلبات شحن',
    rechargeSuccess: 'تم إرسال طلب الشحن بنجاح',
    optional: 'اختياري',
    bankTransfer: 'تحويل بنكي',
    onlinePayment: 'دفع إلكتروني',
    cashPayment: 'دفع نقدي',
    mobileWallet: 'محفظة الهاتف',
    processing: 'جاري المعالجة...',
    allTransactions: 'جميع المعاملات',
    recentTransactions: 'المعاملات الأخيرة',
    quickActions: 'الإجراءات السريعة',
    manageWallet: 'إدارة محفظتك',
    walletRechargeRequest: 'طلب شحن المحفظة',
    fillRechargeDetails: 'املأ التفاصيل أدناه لطلب شحن المحفظة',
    enterAmount: 'أدخل المبلغ',
    selectPaymentMethod: 'اختر طريقة الدفع',
    iraqiDinar: 'الدينار العراقي (IQD)',
    usDollar: 'الدولار الأمريكي (USD)',
    euro: 'اليورو (EUR)',
    enterPaymentReference: 'أدخل مرجع الدفع (اختياري)',
    enterNotes: 'أدخل ملاحظات (اختياري)',
    bankReference: 'رقم مرجع البنك',
    enterBankReference: 'أدخل رقم مرجع البنك',
    rechargeAmount: 'مبلغ الشحن',
    bankReceipt: 'إيصال بنكي',
    rechargeHistory: 'تاريخ الشحن',
    uploadBankReceipt: 'رفع إيصال البنك (JPG, PNG, PDF)',
    bankReceiptRequired: 'إيصال البنك مطلوب للتحويل البنكي',
    bankReferenceRequired: 'رقم مرجع البنك مطلوب للتحويل البنكي',
    inputError: 'خطأ في الإدخال',
    validAmount: 'يرجى إدخال مبلغ صحيح',
    requestError: 'خطأ في الطلب',
    errorCreatingRequest: 'خطأ في إنشاء طلب شحن المحفظة',
    loginToAccessWallet: 'يرجى تسجيل الدخول للوصول إلى محفظتك',
    goToLogin: 'الذهاب إلى تسجيل الدخول',
    totalWithdrawals: 'إجمالي السحوبات',
    totalDeposits: 'إجمالي الإيداعات',
    requestSubmitted: 'تم إرسال طلب شحن محفظتك بنجاح وهو في انتظار الموافقة.',
    requestPendingApproval: 'الطلب في انتظار الموافقة',
    requestRecharge: 'طلب شحن',
    
    // Wallet Management (Admin)
    walletHolders: 'حاملو المحفظة',
    walletManagement: 'إدارة المحفظة',
    changeAmount: 'تغيير المبلغ',
    reason: 'السبب',
    
    // Customer Profile
    welcomeCustomer: 'مرحباً',
    customerProfile: 'الملف الشخصي للعميل',
    manageAccount: 'إدارة حسابك وعرض تاريخ الطلبات',
    editProfile: 'تحرير الملف الشخصي',
    continueShopping: 'متابعة التسوق',
    accountInformation: 'معلومات الحساب',
    fullName: 'الاسم الكامل',
    contactDetails: 'تفاصيل الاتصال',
    orderNumber: 'رقم الطلب',
    totalAmount: 'المبلغ الإجمالي',
    noOrders: 'لا توجد طلبات',
    viewOrder: 'عرض الطلب',
    orderDate: 'تاريخ الطلب',
    orderStatus: 'حالة الطلب',
    confirmed: 'مؤكد',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
    logoutSuccessful: 'تم تسجيل الخروج بنجاح',
    logoutSuccessfulDesc: 'تم تسجيل خروجك بنجاح',
    logoutError: 'حدث خطأ أثناء تسجيل الخروج',
    error: 'خطأ',
    
    // Forms
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    address: 'العنوان',
    city: 'المدينة',
    country: 'البلد',
    company: 'الشركة',
    
    // Messages
    welcomeMessage: 'مرحباً بكم في مجمع ممتاز الكيميائي',
    thankYou: 'شكراً لكم',
    orderConfirmed: 'تم تأكيد طلبكم',
    contactSuccess: 'تم إرسال رسالتكم بنجاح',
    
    // Auth & Login
    auth: {
      login: 'تسجيل الدخول',
      register: 'إنشاء حساب',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      forgotPassword: 'هل نسيت كلمة المرور؟',
      loggingIn: 'جاري تسجيل الدخول...',
      registering: 'جاري إنشاء الحساب...',
      welcome: 'أهلاً بك',
      or: 'أو',
      continueWithGoogle: 'متابعة مع جوجل',
      continueWithFacebook: 'متابعة مع فيسبوك',
      loginSuccess: 'تم تسجيل الدخول بنجاح',
      invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      loginError: 'خطأ في تسجيل الدخول',
      serverError: 'خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى',
      networkError: 'خطأ في الشبكة',
      networkErrorDesc: 'مشكلة في الاتصال. يرجى المحاولة مرة أخرى.',
      enterEmail: 'أدخل بريدك الإلكتروني',
      enterPassword: 'أدخل كلمة المرور',
      switchToLogin: 'التبديل إلى تسجيل الدخول',
      customerLogin: 'تسجيل دخول العميل',
      signInOrRegister: 'سجل الدخول إلى حسابك أو أنشئ حساباً جديداً',
      verifyMobileNumber: 'تحقق من رقم الهاتف المحمول',
      verificationCodeDescription: 'أدخل رمز التحقق المرسل إلى هاتفك المحمول',
      smsVerification: 'التحقق عبر الرسائل النصية',
      verificationCodeSent: 'تم إرسال رمز مكون من 4 أرقام إلى',
      codeSentTo: 'تم إرسال رمز إلى',
      enterVerificationCode: 'أدخل رمز التحقق',
      enterCodePlaceholder: 'أدخل الرمز المكون من 4 أرقام',
      enter4DigitCode: 'أدخل الرمز المكون من 4 أرقام',
      fourDigitCode: 'رمز مكون من 4 أرقام',
      sixDigitCode: 'رمز مكون من 6 أرقام',
      verifying: 'جاري التحقق...',
      verifyCode: 'تحقق من الرمز',
      verifyCodes: 'تحقق من الرموز',
      resend: 'إعادة الإرسال',
      back: 'رجوع',
      basicInformation: 'المعلومات الأساسية',
      contactInformation: 'معلومات الاتصال',
      addressInformation: 'معلومات العنوان',
      additionalInformation: 'معلومات إضافية',
      mobileNumber: 'رقم الهاتف المحمول',
      whatsappNumber: 'رقم الواتساب (إذا كان مختلفاً)',
      whatsappDefault: 'يتم استخدام رقم الهاتف المحمول افتراضياً',
      whatsappOptional: 'رقم الواتساب (اختياري)',
      leaveEmptyIfSame: 'اترك فارغاً إذا كان نفس رقم الهاتف المحمول',
      alternatePhone: 'هاتف بديل',
      province: 'المحافظة',
      selectProvince: 'اختر المحافظة',
      selectCity: 'اختر المدينة',
      selectCountry: 'اختر البلد',
      fullAddress: 'العنوان الكامل',
      secondaryAddress: 'العنوان الثانوي',
      postalCode: 'الرمز البريدي',
      industry: 'الصناعة',
      businessType: 'نوع العمل',
      companySize: 'حجم الشركة',
      manufacturer: 'مصنّع',
      distributor: 'موزع',
      retailer: 'تاجر تجزئة',
      endUser: 'مستخدم نهائي',
      small: 'صغيرة (1-50 موظف)',
      medium: 'متوسطة (51-250 موظف)',
      large: 'كبيرة (251-1000 موظف)',
      enterprise: 'مؤسسة (أكثر من 1000 موظف)',
      communicationPreference: 'تفضيلات التواصل',
      preferredLanguage: 'اللغة المفضلة',
      english: 'الإنجليزية',
      arabic: 'العربية',
      persian: 'الفارسية',
      marketingConsent: 'أوافق على تلقي الاتصالات التسويقية',
      requiredField: 'حقل مطلوب',
      verificationCodesSent: 'تم إرسال رموز التحقق',
      verificationCodesError: 'خطأ في إرسال رموز التحقق',
      registrationSuccessful: 'تم التسجيل بنجاح',
      accountCreated: 'تم إنشاء حسابك بنجاح',
      registrationError: 'خطأ في التسجيل',
      invalidCodes: 'رموز التحقق غير صالحة',
      verificationError: 'خطأ في التحقق من الرموز. يرجى المحاولة مرة أخرى',
      smsCodeLabel: 'رمز التحقق عبر الرسائل النصية',
      emailCodeLabel: 'رمز التحقق عبر البريد الإلكتروني',
      sentTo: 'تم الإرسال إلى',
      and: 'و',
      verify: 'تحقق',
      emailAlreadyRegistered: 'البريد الإلكتروني مسجل مسبقاً',
      emailAlreadyRegisteredDesc: 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.',
      emailAlreadyRegisteredMessage: 'هذا البريد الإلكتروني مسجل مسبقاً',
      creatingAccount: 'جاري إنشاء الحساب...',
      createAccount: 'إنشاء حساب',
      dualVerification: 'التحقق المزدوج',
      verificationCodesSentTo: 'تم إرسال رموز التحقق إلى',
      profileUpdated: 'تم تحديث الملف الشخصي',
      profileUpdatedDesc: 'تم تحديث ملفك الشخصي بنجاح',
      updateError: 'خطأ في التحديث',
      updateFailed: 'فشل تحديث الملف الشخصي',
      registrationVerificationSent: 'تم التسجيل بنجاح',
      verificationSentDesc: 'تم إرسال رمز التحقق إلى رقم هاتفك المحمول',
      
      // Validation Messages
      validation: {
        invalidEmail: 'يرجى إدخال بريد إلكتروني صالح',
        passwordMin6: 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل',
        firstNameMin2: 'يجب أن يتكون الاسم الأول من حرفين على الأقل',
        lastNameMin2: 'يجب أن يتكون اسم العائلة من حرفين على الأقل',
        phoneMin10: 'رقم الهاتف مطلوب',
        countryRequired: 'البلد مطلوب',
        provinceRequired: 'المحافظة مطلوبة',
        cityRequired: 'المدينة مطلوبة',
        addressMin5: 'العنوان مطلوب',
        passwordsMustMatch: 'يجب أن تتطابق كلمات المرور',
      },
    },
    
    // Notifications and Toast Messages
    success: 'نجح',
    errorOccurred: 'حدث خطأ',
    warning: 'تحذير',
    info: 'معلومات',
    loginSuccessful: 'تم تسجيل الدخول بنجاح',
    loginFailed: 'فشل تسجيل الدخول',
    registrationSuccessful: 'تم التسجيل بنجاح',
    registrationFailed: 'فشل التسجيل',
    orderCreated: 'تم إنشاء الطلب بنجاح',
    orderFailed: 'فشل في إنشاء الطلب',
    addedToCart: 'تم إضافة المنتج إلى السلة',
    removedFromCart: 'تم إزالة المنتج من السلة',
    cartCleared: 'تم تفريغ السلة',
    profileUpdated: 'تم تحديث الملف الشخصي بنجاح',
    profileUpdateFailed: 'فشل في تحديث الملف الشخصي',
    passwordChanged: 'تم تغيير كلمة المرور بنجاح',
    passwordChangeFailed: 'فشل في تغيير كلمة المرور',
    emailSent: 'تم إرسال البريد الإلكتروني بنجاح',
    emailFailed: 'فشل في إرسال البريد الإلكتروني',
    dataLoaded: 'تم تحميل البيانات بنجاح',
    dataLoadFailed: 'فشل في تحميل البيانات',
    unauthorized: 'غير مخول',
    unauthorizedDesc: 'تم تسجيل خروجك. جاري تسجيل الدخول مرة أخرى...',
    productNotFound: 'المنتج غير موجود',
    networkError: 'خطأ في الشبكة',
    tryAgain: 'يرجى المحاولة مرة أخرى',
    pleaseWait: 'يرجى الانتظار...',
    
    // Product categories
    waterTreatment: 'معالجة المياه',
    fuelAdditives: 'إضافات الوقود',
    paintThinner: 'مخفف الدهان',
    agriculturalFertilizers: 'الأسمدة الزراعية',
    paintSolvents: 'الدهان والمذيبات',
    industrialChemicals: 'المواد الكيميائية الصناعية',
    technicalEquipment: 'المعدات الفنية',
    commercialGoods: 'السلع التجارية',
    
    // Product category descriptions
    fuelAdditivesDesc: 'إضافات وقود عالية الأداء لتحسين كفاءة المحرك',
    waterTreatmentDesc: 'حلول شاملة لمعالجة المياه لجميع التطبيقات',
    paintSolventsDesc: 'تركيبات دهانات متميزة ومذيبات متخصصة',
    agriculturalFertilizersDesc: 'حلول أسمدة متقدمة للزراعة المستدامة',
    industrialChemicalsDesc: 'حلول كيميائية صناعية احترافية',
    paintThinnerDesc: 'مخففات دهان متخصصة ومنتجات ذات صلة',
    technicalEquipmentDesc: 'معدات وأدوات فنية احترافية',
    commercialGoodsDesc: 'السلع التجارية وحلول الأعمال',
    
    // Product Reviews
    productReviews: 'مراجعات المنتج',
    customerReviews: 'آراء العملاء',
    addYourReview: 'أضف مراجعتك',
    writeReview: 'اكتب مراجعة',
    rating: 'التقييم',
    comment: 'التعليق',
    customerName: 'اسم العميل',
    submitReview: 'إرسال المراجعة',
    reviewSubmitted: 'تم تقديم المراجعة',
    reviewSubmittedDesc: 'تم تقديم مراجعتك بنجاح',
    reviewError: 'خطأ في تقديم المراجعة',
    reviewErrorDesc: 'خطأ',
    loadingReviews: 'جاري تحميل المراجعات...',
    customerReviewTitle: 'رأي العميل حول',
    backToShop: 'العودة للمتجر',
    averageRating: 'متوسط التقييم',
    totalReviews: 'إجمالي المراجعات',
    noReviewsYet: 'لا توجد مراجعات بعد',
    noReviewsDesc: 'كن أول من يراجع هذا المنتج',
    productSpecifications: 'المواصفات',
    reviewsAndRatings: 'المراجعات والتقييمات',
    customerFeedback: 'ملاحظات العملاء',
    productReviewsFor: 'آراء المنتج:',
    totalReviewsCount: 'إجمالي الآراء',
    loginToReview: 'سجل دخولك لإضافة رأيك',
    loginToReviewDesc: 'لإضافة رأيك وتقييم المنتجات، يرجى تسجيل الدخول إلى حسابك أولاً',
    reviewingAs: 'المراجعة باسم:',
    yourPreviousReview: 'رأيك السابق:',
    editReview: 'تعديل الرأي',
    postedOn: 'نُشر في:',
    editYourReview: 'عدّل رأيك...',
    updateReview: 'تحديث الرأي',
    beFirstToReview: 'كن أول من يقيّم',
    you: '(أنت)',
    reviewUpdated: 'تم تحديث الرأي بنجاح',
    reviewUpdatedDesc: 'تم حفظ تغييراتك',
    review: 'رأي',
    reviews: 'آراء',
    
    // Contact Page
    contactPage: {
      // Form Labels
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      emailAddress: 'البريد الإلكتروني',
      company: 'الشركة',
      productInterest: 'الاهتمام بالمنتج',
      message: 'الرسالة',
      
      // Form Placeholders
      firstNamePlaceholder: 'أحمد',
      lastNamePlaceholder: 'علي',
      emailPlaceholder: 'ahmed@company.com',
      companyPlaceholder: 'شركتك',
      productInterestPlaceholder: 'اختر فئة المنتج',
      messagePlaceholder: 'أخبرنا عن متطلباتك...',
      
      // Product Categories
      waterTreatment: 'معالجة المياه',
      fuelAdditives: 'إضافات الوقود',
      paintThinner: 'الدهان والمذيبات',
      agriculturalFertilizers: 'الأسمدة الزراعية',
      industrialChemicals: 'المواد الكيميائية الصناعية',
      technicalEquipment: 'المعدات الفنية',
      commercialGoods: 'السلع التجارية',
      customSolutions: 'حلول مخصصة',
      
      // Buttons
      sending: 'جاري الإرسال...',
      sendMessage: 'إرسال الرسالة',
      
      // Toast Messages
      messageSent: 'تم إرسال الرسالة بنجاح',
      messageSentDesc: 'شكراً لاستفساركم. سنعود إليكم خلال 24 ساعة.',
      errorTitle: 'خطأ',
      errorDesc: 'فشل إرسال الرسالة. يرجى المحاولة مرة أخرى.',
      
      // Sections
      contactInformation: 'معلومات الاتصال',
      ourCertifications: 'شهاداتنا',
      findUs: 'ابحث عنا',
      visitHeadquarters: 'قم بزيارة مقرنا الرئيسي ومنشآتنا التصنيعية',
      getDirections: 'احصل على الاتجاهات',
      viewInMaps: 'عرض في خرائط Google',
    },
    
    // Footer
    aboutCompany: 'حول الشركة',
    contactInfo: 'معلومات الاتصال',
    followUs: 'تابعونا',
    allRightsReserved: 'جميع الحقوق محفوظة',
    
    // Home Page - Hero Section
    advancedChemical: 'حلول كيميائية',
    solutions: 'متقدمة',
    forIndustry: 'للصناعة',
    heroDescription: 'الشركة الرائدة في تصنيع إضافات الوقود المتميزة، وأنظمة معالجة المياه، ومنتجات الدهانات والمذيبات، والأسمدة الزراعية للصناعات العالمية.',
    exploreProducts: 'استكشف المنتجات',
    contactSales: 'اتصل بالمبيعات',
    callForPrice: 'تواصل للسعر',
    
    // Home Page - Products
    ourProductPortfolio: 'مجموعة منتجاتنا',
    productPortfolioDesc: 'حلول كيميائية شاملة عبر أربعة صناعات رئيسية، مصممة للأداء والموثوقية.',
    products_plural: 'منتجات',
    availableProducts: 'المنتجات المتوفرة:',
    moreProducts: 'المزيد من المنتجات',
    viewAll: 'عرض الكل',
    aboutMomtazchem: 'حول ممتاز كيم',
    aboutMomtazchemDesc1: 'مع أكثر من 25 عامًا من التميز في تصنيع المواد الكيميائية، أثبتت ممتاز كيم نفسها كشريك موثوق للصناعات في جميع أنحاء العالم. التزامنا بالابتكار والجودة والاستدامة يدفع كل ما نقوم به.',
    aboutMomtazchemDesc2: 'من منشآتنا الحديثة، نطور وننتج حلولًا كيميائية عالية الجودة تلبي الاحتياجات المتطورة للوقود ومعالجة المياه والدهانات والصناعات الزراعية.',
    learnMoreAboutUs: 'تعرف على المزيد عنا',
    customerSatisfaction: 'رضا العملاء',
    ourServicesCapabilities: 'خدماتنا وقدراتنا',
    servicesCapabilitiesDesc: 'دعم شامل من البحث والتطوير إلى التسليم والمساعدة الفنية.',
    rdServices: 'خدمات البحث والتطوير',
    rdServicesDesc: 'تطوير تركيبات مخصصة وتحسين المنتجات لتلبية متطلبات الصناعة المحددة.',
    customFormulations: 'تركيبات مخصصة',
    productTesting: 'اختبار المنتج',
    performanceAnalysis: 'تحليل الأداء',
    globalDistribution: 'التوزيع العالمي',
    globalDistributionDesc: 'سلسلة توريد ولوجستيات موثوقة تضمن التسليم في الوقت المناسب في جميع أنحاء العالم.',
    countries40Plus: '40+ دولة',
    expressShipping: 'شحن سريع',
    bulkOrders: 'طلبات بالجملة',
    technicalSupport: 'الدعم الفني',
    technicalSupportDesc: 'مساعدة فنية خبيرة واستشارات لتطبيق المنتج الأمثل والأداء.',
    support24_7: 'دعم 24/7',
    applicationTraining: 'تدريب التطبيق',
    documentation: 'التوثيق',
    
    // About page
    aboutTitle: 'حول مجمع ممتاز الكيميائي',
    aboutSubtitle: 'نقود صناعة الكيماويات بالابتكار والجودة والاستدامة لأكثر من 25 عاماً.',
    ourStory: 'قصتنا',
    ourMission: 'مهمتنا',
    ourVision: 'رؤيتنا',
    ourCoreValues: 'قيمنا الأساسية',
    valuesSubtitle: 'المبادئ التي توجه قراراتنا وتشكل ثقافتنا كل يوم.',
    ourTeamExpertise: 'فريقنا وخبرتنا',
    certificationsCompliance: 'الشهادات والامتثال',
    certificationsSubtitle: 'نحافظ على أعلى معايير الصناعة والشهادات لضمان الجودة والسلامة والمسؤولية البيئية.',
    
    // About content
    storyParagraph1: 'تأسس مجمع ممتاز الكيميائي في عام 1999 كشركة صغيرة لتصنيع المواد الكيميائية برؤية لتوفير حلول كيميائية عالية الجودة للصناعات في جميع أنحاء العالم. خلال السنوات الـ 25 الماضية، نمونا لنصبح شركة رائدة في التصنيع تخدم أربعة قطاعات سوقية رئيسية.',
    storyParagraph2: 'تميزت رحلتنا بالابتكار المستمر والتوسع الاستراتيجي والالتزام الثابت بالجودة. اليوم، نشغل مرافق تصنيع متطورة ونخدم العملاء في أكثر من 40 دولة حول العالم.',
    storyParagraph3: 'ونحن نتطلع إلى المستقبل، نبقى ملتزمين بتطوير علوم الكيمياء ودعم نجاح عملائنا والمساهمة في عالم أكثر استدامة.',
    missionText: 'تطوير وتصنيع حلول كيميائية مبتكرة تعزز العمليات الصناعية وتحسن أداء المنتجات وتساهم في التنمية المستدامة مع الحفاظ على أعلى معايير الجودة والسلامة.',
    visionText: 'أن نكون الشريك الأكثر ثقة في العالم في الحلول الكيميائية، معترف بنا لابتكارنا واستدامتنا والتزامنا بتطوير الصناعات مع حماية البيئة للأجيال القادمة.',
    teamText: 'يُبنى نجاحنا على خبرة فريقنا وتفانيه. نوظف أكثر من 500 محترف، بما في ذلك مهندسي الكيمياء وعلماء البحوث ومتخصصي الجودة وخبراء الصناعة.',
    
    // Values
    qualityExcellence: 'التميز في الجودة',
    qualityExcellenceDesc: 'نحافظ على أعلى المعايير في جميع منتجاتنا وعملياتنا، مع شهادات ISO التي تضمن الجودة المتسقة.',
    sustainability: 'الاستدامة',
    sustainabilityDesc: 'ملتزمون بالممارسات المستدامة والحلول المسؤولة بيئياً',
    environmentalResponsibility: 'المسؤولية البيئية',
    environmentalResponsibilityDesc: 'ملتزمون بممارسات التصنيع المستدامة وتطوير الحلول الكيميائية الصديقة للبيئة.',
    customerFocus: 'التركيز على العملاء',
    customerFocusDesc: 'نجاح عملائنا هو أولويتنا. نقدم حلولاً مخصصة وخدمة استثنائية.',
    globalReach: 'الوصول العالمي',
    globalReachDesc: 'خدمة العملاء في أكثر من 40 دولة مع سلاسل إمداد موثوقة ودعم محلي.',
    
    // Stats
    employees: 'موظف',
    rdScientists: 'علماء البحث والتطوير',
    manufacturingSites: 'مواقع التصنيع',
    qualityRate: 'معدل الجودة',
    
    // Certifications
    iso9001: 'ISO 9001:2015',
    iso9001Desc: 'أنظمة إدارة الجودة',
    iso14001: 'ISO 14001',
    iso14001Desc: 'الإدارة البيئية',
    ohsas18001: 'OHSAS 18001',
    ohsas18001Desc: 'الصحة والسلامة المهنية',
    reachCompliance: 'الامتثال لـ REACH',
    reachComplianceDesc: 'لائحة المواد الكيميائية الأوروبية',
    
    // Product Form
    addProduct: 'إضافة منتج',
    editProduct: 'تحرير منتج',
    productName: 'اسم المنتج',
    shortDescription: 'وصف مختصر',
    productDescription: 'وصف المنتج',
    priceRange: 'نطاق السعر',
    productCategory: 'فئة المنتج',
    productFeatures: 'ميزات المنتج',
    productApplications: 'تطبيقات المنتج',
    productTags: 'علامات المنتج',
    productImage: 'صورة المنتج',
    productCatalog: 'كتالوج المنتج',
    msdsDocument: 'وثيقة MSDS',
    stockQuantity: 'كمية المخزون',
    minStockLevel: 'الحد الأدنى للمخزون',
    maxStockLevel: 'الحد الأقصى للمخزون',
    unitPrice: 'سعر الوحدة',
    netWeight: 'الوزن الصافي',
    grossWeight: 'الوزن الإجمالي',
    weightUnit: 'وحدة الوزن',
    batchNumber: 'رقم الدفعة',
    productSku: 'رمز المنتج',
    productBarcode: 'الباركود',
    isVariant: 'هو متغير منتج',
    parentProduct: 'المنتج الأساسي',
    variantType: 'نوع المتغير',
    variantValue: 'قيمة المتغير',
    syncWithShop: 'مزامنة مع المتجر',
    showWhenOutOfStock: 'إظهار عند عدم التوفر',
    showCatalogToCustomers: 'إظهار الكتالوج للعملاء',
    showMsdsToCustomers: 'إظهار MSDS للعملاء',
    basicInfo: 'المعلومات الأساسية',
    pricingInventory: 'الأسعار والمخزون',
    documentsMedia: 'الوثائق والوسائط',
    variantSettings: 'إعدادات المتغيرات',
    shopSettings: 'إعدادات المتجر',
    weightsAndBatch: 'الأوزان والدفعة',
    productDetails: 'تفاصيل المنتج',
    
    // Services Page
    servicesPage: {
      title: 'خدماتنا وقدراتنا',
      subtitle: 'دعم شامل من البحث والتطوير إلى التسليم والمساعدة الفنية، لضمان نجاحك في كل خطوة على الطريق.',
      
      rdTitle: 'البحث والتطوير',
      rdDesc: 'تطوير تركيبات مخصصة وتحسين المنتجات لتلبية متطلباتك المحددة.',
      rdFeature1: 'تركيبات كيميائية مخصصة',
      rdFeature2: 'اختبار أداء المنتج',
      rdFeature3: 'دعم الامتثال التنظيمي',
      rdFeature4: 'التوسع من المختبر إلى الإنتاج',
      rdFeature5: 'تحسين الجودة',
      rdFeature6: 'تطوير التطبيقات',
      
      distributionTitle: 'التوزيع العالمي',
      distributionDesc: 'سلسلة توريد وشبكة لوجستية موثوقة تضمن التسليم في الوقت المحدد في جميع أنحاء العالم.',
      distFeature1: 'تغطية أكثر من 40 دولة',
      distFeature2: 'خيارات الشحن السريع',
      distFeature3: 'معالجة الطلبات بالجملة',
      distFeature4: 'إدارة السلسلة الباردة',
      distFeature5: 'التتبع الفوري',
      distFeature6: 'التخزين المحلي',
      
      techSupportTitle: 'الدعم الفني',
      techSupportDesc: 'مساعدة فنية واستشارات من الخبراء للتطبيق الأمثل للمنتج.',
      techFeature1: 'خط مساعدة فني على مدار الساعة',
      techFeature2: 'تدريب على التطبيقات',
      techFeature3: 'دعم استكشاف الأخطاء وإصلاحها',
      techFeature4: 'تحسين الأداء',
      techFeature5: 'إرشادات السلامة',
      techFeature6: 'دعم التوثيق',
      
      consultingTitle: 'خدمات الاستشارات',
      consultingDesc: 'استشارات استراتيجية للمساعدة في تحسين عملياتك ومنتجاتك الكيميائية.',
      consultFeature1: 'تحسين العمليات',
      consultFeature2: 'تحليل خفض التكاليف',
      consultFeature3: 'تقييم الاستدامة',
      consultFeature4: 'إرشادات تنظيمية',
      consultFeature5: 'تحليل السوق',
      consultFeature6: 'التخطيط الاستراتيجي',
      
      qaTitle: 'ضمان الجودة',
      qaDesc: 'برامج شاملة لمراقبة الجودة وضمانها لجميع منتجاتنا.',
      qaFeature1: 'عمليات معتمدة من ISO',
      qaFeature2: 'اختبار وتحليل الدفعات',
      qaFeature3: 'شهادة التحليل',
      qaFeature4: 'توثيق الجودة',
      qaFeature5: 'الامتثال التنظيمي',
      qaFeature6: 'المراقبة المستمرة',
      
      customMfgTitle: 'التصنيع المخصص',
      customMfgDesc: 'حلول تصنيع مخصصة للمتطلبات الكيميائية المتخصصة.',
      customFeature1: 'التصنيع بموجب العقد',
      customFeature2: 'العلامات التجارية الخاصة',
      customFeature3: 'أحجام دفعات مرنة',
      customFeature4: 'تركيبات متخصصة',
      customFeature5: 'حلول التعبئة والتغليف',
      customFeature6: 'تكامل سلسلة التوريد',
      
      coreCapabilities: 'قدراتنا الأساسية',
      coreCapabilitiesDesc: 'مدعومة بعقود من الخبرة والتكنولوجيا المتطورة',
      advManufacturing: 'التصنيع المتقدم',
      advManufacturingDesc: 'منشآت حديثة مع معدات وأتمتة عصرية',
      qualityControl: 'مراقبة الجودة',
      qualityControlDesc: 'اختبارات صارمة وضمان الجودة في كل مرحلة',
      globalReachCap: 'الوصول العالمي',
      globalReachCapDesc: 'خدمة العملاء في أكثر من 40 دولة حول العالم',
      expertTeam: 'فريق الخبراء',
      expertTeamDesc: 'أكثر من 50 عالم بحث وتطوير وخبير هندسة كيميائية',
      
      serviceProcess: 'عملية الخدمة لدينا',
      serviceProcessDesc: 'من الاستشارة الأولية إلى الدعم المستمر، نحن معك في كل خطوة',
      consultation: 'الاستشارة',
      consultationDesc: 'فهم متطلباتك وتحدياتك المحددة',
      development: 'التطوير',
      developmentDesc: 'تطوير التركيبات والحلول المخصصة',
      testing: 'الاختبار',
      testingDesc: 'اختبار صارم والتحقق من الجودة',
      delivery: 'التسليم',
      deliveryDesc: 'الإنتاج والتسليم والدعم المستمر',
      
      readyToStart: 'هل أنت مستعد للبدء؟',
      contactExpertsDesc: 'اتصل بفريق الخبراء لدينا لمناقشة احتياجاتك من الحلول الكيميائية واكتشف كيف يمكننا مساعدة عملك على النجاح.',
      contactSales: 'اتصل بفريق المبيعات',
      requestQuote: 'طلب عرض أسعار',
      
      contactSalesTitle: 'اتصل بفريق المبيعات',
      fullName: 'الاسم الكامل',
      emailAddress: 'عنوان البريد الإلكتروني',
      companyName: 'الشركة',
      phoneNumber: 'رقم الهاتف',
      message: 'الرسالة',
      messagePlaceholder: 'أخبرنا عن متطلباتك...',
      cancel: 'إلغاء',
      sendMessage: 'إرسال الرسالة',
      sending: 'جاري الإرسال...',
      
      requestQuoteTitle: 'طلب عرض أسعار',
      productCategory: 'فئة المنتج',
      productCategoryPlaceholder: 'مثل: الأسمدة الزراعية، معالجة المياه، إلخ.',
      requiredQuantity: 'الكمية المطلوبة',
      quantityPlaceholder: 'مثل: 500 كجم، 10 أطنان',
      requiredTimeline: 'الجدول الزمني المطلوب',
      timelinePlaceholder: 'مثل: في غضون أسبوعين',
      productSpecs: 'مواصفات المنتج',
      specsPlaceholder: 'يرجى تقديم مواصفات مفصلة، متطلبات النقاء، تفضيلات التعبئة، إلخ.',
      additionalReqs: 'المتطلبات الإضافية',
      additionalPlaceholder: 'أي معلومات إضافية أو متطلبات خاصة...',
      submitQuote: 'تقديم طلب عرض الأسعار',
      submitting: 'جاري التقديم...',
      
      messageSent: 'تم إرسال الرسالة بنجاح',
      messageSentDesc: 'سيتصل بك فريق المبيعات لدينا خلال 24 ساعة.',
      quoteSubmitted: 'تم تقديم طلب عرض الأسعار',
      quoteSubmittedDesc: 'سيقوم فريقنا بإعداد عرض الأسعار والرد خلال 24 ساعة.',
      errorTitle: 'خطأ',
      messageFailed: 'فشل إرسال الرسالة. يرجى المحاولة مرة أخرى.',
      quoteFailed: 'فشل تقديم طلب عرض الأسعار. يرجى المحاولة مرة أخرى.',
    },
  },

  tr: {
    // Navigation
    home: 'Ana Sayfa',
    about: 'Hakkımızda',
    services: 'Hizmetler',
    products: 'Ürünler',
    contact: 'İletişim',
    shop: {
      title: 'Mağaza',
      lowStockWarning: 'Sadece {count} ürün kaldı!',
      priceFilter: 'Fiyat Filtresi',
      minPrice: 'Min',
      maxPrice: 'Max',
      inStock: 'Stokta Var',
      outOfStock: 'Stok Yok',
      volumeDeals: 'Toplu Alım İndirimleri',
      active: 'AKTİF',
      off: 'İNDİRİM',
      more: 'daha fazla',
      items: 'ürün',
      max: 'MAK',
      buy: 'Satın Al',
      catalog: 'Katalog',
      addToCart: 'Sepete Ekle',
      addMore: 'Daha Ekle',
      notAvailable: 'Mevcut Değil',
      insufficientStock: 'Yetersiz Stok',
      maxStockInCart: 'Bu ürünün maksimum stoğu sepete eklendi',
      onlyXAvailable: 'Bu üründen sadece {count} adet mevcut',
      onlyXLeft: 'Sadece {count} kaldı!',
      productReviews: 'Ürün Yorumları ve Puanlaması',
      technicalSpecs: 'Teknik Özellikler',
      hideWalletBalance: 'Cüzdan Bakiyesini Gizle',
      showWalletBalance: 'Cüzdan Bakiyesini Göster',
      addedToCart: 'Sepete Eklendi',
      addedToCartDesc: '{count} adet {product} sepete eklendi',
      welcome: 'Hoş Geldiniz',
      registrationSuccessful: 'Kayıt Başarılı',
      welcomeMessage: 'Hoş geldiniz {name}',
      logoutSuccessful: 'Çıkış Başarılı',
      logoutMessage: 'Başarıyla çıkış yaptınız',
      error: 'Hata',
      logoutError: 'Çıkış sırasında hata',
      loginSuccessful: 'Giriş Başarılı',
      loginWelcome: 'Tekrar hoş geldiniz! Artık ödeme yapabilirsiniz',
      unit: 'adet',
      units: 'adet',
      filters: 'Filtreler',
      searchProducts: 'Ürün Ara',
      searchProductsPlaceholder: '...Ürün ara',
      sortBy: 'Sırala',
      relevance: 'İlgililik',
      name: 'İsim',
      categories: 'Kategoriler',
      priceRange: 'Fiyat Aralığı',
      clearAllFilters: 'Tüm Filtreleri Temizle',
      clearFilters: 'Tüm filtreleri temizle',
      ascending: 'Artan',
      descending: 'Azalan',
      highToLow: 'Yüksekten Düşüğe',
      lowToHigh: 'Düşükten Yükseğe',
      aToZ: 'A-Z',
      zToA: 'Z-A',
      availability: 'Stok Durumu',
      inStockOnly: 'Sadece Stokta Olanlar',
      newest: 'En Yeni',
      showingProducts: 'Gösterilen',
      page: 'sayfa',
      of: '/',
      product: 'ürün',
      products: 'ürünler',
    },

    blog: {
      title: 'Blog - Kimya Sektörü İçgörüleri',
      subtitle: 'Kimyasal çözümler, yakıt katkıları, su arıtma ve endüstriyel kimyasallar hakkında en son makaleler, rehberler ve içgörüler',
      searchPlaceholder: 'Başlık veya içeriğe göre makale ara...',
      allTags: 'Tüm Etiketler',
      readMore: 'Devamını Oku',
      by: 'Yazan',
      views: 'görüntüleme',
      noPostsFound: 'Gönderi Bulunamadı',
      noPostsMessage: 'Kriterlerinize uyan blog gönderisi bulunamadı. Arama veya filtrelerinizi ayarlamayı deneyin.',
      loadingPosts: 'Gönderiler yükleniyor...',
      previousPage: 'Önceki',
      nextPage: 'Sonraki',
      page: 'Sayfa',
      of: '/',
    },

    blogPost: {
      loading: 'Makale yükleniyor...',
      notFound: 'Makale Bulunamadı',
      notFoundMessage: 'Aradığınız makale mevcut değil veya kaldırılmış.',
      backToBlog: 'Bloga Dön',
      shareArticle: 'Makaleyi Paylaş',
      copyLink: 'Bağlantıyı Kopyala',
      linkCopied: 'Bağlantı Kopyalandı!',
      linkCopiedMessage: 'Makale bağlantısı panonuza kopyalandı.',
      tableOfContents: 'İçindekiler',
      aboutAuthor: 'Yazar Hakkında',
      relatedPosts: 'İlgili Makaleler',
      noRelatedPosts: 'İlgili makale bulunamadı.',
      readingTime: 'Okuma Süresi',
      minutes: 'dk okuma',
      publishedOn: 'Yayınlanma tarihi',
      updatedOn: 'Güncellenme tarihi',
      previousPost: 'Önceki Makale',
      nextPost: 'Sonraki Makale',
      tags: 'Etiketler',
      share: 'Paylaş',
    },

    checkout_page: {
      welcomeTitle: 'Ödemeye Hoş Geldiniz',
      orderPlacedSuccess: 'Sipariş Başarıyla Verildi!',
      orderFailed: 'Sipariş Başarısız',
      orderFailedDesc: 'Siparişiniz işlenirken bir hata oluştu. Lütfen tekrar deneyin.',
      customerInfo: 'Müşteri Bilgileri',
      firstName: 'Ad',
      lastName: 'Soyad',
      emailAddress: 'E-posta Adresi',
      phoneNumber: 'Telefon Numarası',
      company: 'Şirket',
      required: '*',
      billingAddress: 'Fatura Adresi',
      shippingAddress: 'Teslimat Adresi',
      fullAddress: 'Tam Adres',
      addressLine1: 'Adres Satırı 1',
      addressLine2: 'Adres Satırı 2',
      city: 'Şehir',
      state: 'İl/İlçe',
      province: 'İl',
      postalCode: 'Posta Kodu',
      country: 'Ülke',
      selectProvince: 'İl Seçin',
      selectCity: 'Şehir Seçin',
      selectProvinceFirst: 'Önce İl Seçin',
      recipientInfo: 'Alıcı Bilgileri',
      recipientName: 'Alıcı Adı',
      recipientPhone: 'Alıcı Telefonu',
      recipientMobile: 'Alıcı Cep Telefonu',
      recipientAddress: 'Alıcı Adresi',
      deliveryAddress: 'Teslimat Adresi',
      fullRecipientName: 'Alıcının Tam Adı',
      recipientMobilePlaceholder: '09123456789',
      fullDeliveryAddress: 'Tam Teslimat Adresi',
      secondAddress: 'İkinci Adres',
      secondDeliveryAddress: 'İkinci Teslimat Adresi',
      secondFullAddress: 'İkinci Tam Adres',
      secondCity: 'İkinci Şehir',
      secondProvince: 'İkinci İl',
      secondPostalCode: 'İkinci Posta Kodu',
      mobileDeliveryRecipient: 'Teslimat Alıcısı Cep Telefonu',
      shippingMethod: 'Kargo Yöntemi',
      selectShippingMethod: 'Kargo Yöntemi Seçin',
      smartSelection: 'Akıllı Seçim',
      deliveryMethod: 'Teslimat Yöntemi',
      estimatedDelivery: 'Tahmini Teslimat',
      shippingCost: 'Kargo Ücreti',
      shippingCostLabel: 'Kargo Ücreti:',
      freeShipping: 'Ücretsiz',
      days: 'gün',
      vehicleType: 'Araç Tipi',
      calculatingBestVehicle: '🔄 En iyi araç hesaplanıyor...',
      smartSelectionDetails: '📋 Akıllı Seçim Detayları:',
      selectedVehicleLabel: '🚛 Seçilen Araç:',
      weightCapacity: '⚖️ Ağırlık Kapasitesi:',
      volumeCapacity: '📦 Hacim Kapasitesi:',
      allowedRoutesLabel: '🛣️ İzin Verilen Güzergahlar:',
      hazardousTransport: '⚠️ Tehlikeli Madde Taşımacılığı',
      refrigeratedTransport: '❄️ Soğutmalı Taşıma',
      fragileHandling: '📱 Kırılgan Ürünler İçin Uygun',
      freeShippingOver: '✓ İlgili tutarın üzerindeki alışverişlerde ücretsiz kargo',
      moreForFreeShipping: 'ücretsiz kargo için daha fazla',
      cubicMeter: 'metreküp',
      freightCollect: 'Ödemeli Kargo',
      freightCollectDescription: 'Kargo ücreti teslimat sırasında müşteri tarafından ödenecektir',
      freightCollectNote: 'Şu an kargo ücreti alınmıyor - teslimat sırasında ödenecek',
      freightCollectSelected: 'Ödemeli Kargo - Kargo teslimatta ödenecek',
      paymentInfo: 'Ödeme Bilgileri',
      paymentMethodTitle: 'Ödeme Yöntemi',
      selectPaymentMethod: 'Ödeme Yöntemi Seçin *',
      selectPaymentPlaceholder: 'Ödeme yöntemi seçin',
      bankReceiptUpload: 'Banka Makbuzu Yükle',
      onlinePaymentMethod: 'Online Ödeme',
      walletPayment: 'Cüzdan Ödemesi',
      walletPaymentTitle: 'Cüzdan Bakiyesi',
      useWallet: 'Cüzdan Kullan',
      walletBalance: 'Bakiye:',
      walletAmountToUse: 'Cüzdandan Kullanılacak Tutar (IQD)',
      amountToUse: 'Kullanılacak Tutar',
      maxAmount: 'Maks',
      maximum: 'Maksimum',
      amountFromWallet: 'Cüzdandan Tutar:',
      remainingAmount: 'Kalan Tutar:',
      remainingBalance: 'Kalan Bakiye',
      availableFunds: 'mevcut',
      orderFullyPaidByWallet: '✓ Sipariş cüzdan ile tamamen ödenecek - ek ödeme gerekmez',
      noAdditionalPaymentNeeded: 'ek ödeme gerekmez',
      secondaryPayment: 'İkincil Ödeme Yöntemi',
      selectSecondaryPayment: 'İkincil Ödeme Yöntemi Seçin',
      orderNotes: 'Sipariş Notları',
      orderNotesOptional: 'Sipariş Notları (İsteğe Bağlı)',
      orderNotesPlaceholder: 'Özel teslimat talimatları veya ek bilgiler...',
      specialInstructions: 'Özel Talimatlar',
      placeOrder: 'Sipariş Ver',
      processingOrder: 'Sipariş İşleniyor...',
      continueToPayment: 'Ödemeye Devam Et',
      backToShop: 'Mağazaya Dön',
      orderNumber: 'Sipariş Numarası',
      purchaseOrder: 'Satın Alma Siparişi',
      orderSummary: 'Sipariş Özeti',
      productList: 'Ürün Listesi',
      subtotal: 'Ara Toplam',
      totalWeight: 'Toplam Ağırlık',
      shipping: 'Kargo',
      tax: 'Vergi',
      discount: 'İndirim',
      walletUsed: 'Cüzdan Kullanıldı',
      total: 'Toplam',
      minimize: 'Küçült',
      cartManagement: 'Sepet Yönetimi',
      removeItem: 'Ürünü Kaldır',
      updateQuantity: 'Miktarı Güncelle',
      emptyCart: 'Sepeti Boşalt',
      validEmail: 'Lütfen geçerli bir e-posta adresi girin',
      minCharacters: 'En az {min} karakter gerekli',
      minTwoCharacters: 'Minimum 2 karakter gerekli',
      validPhone: 'Lütfen geçerli bir telefon numarası girin',
      addressRequired: 'Adres gerekli',
      cityRequired: 'Şehir gerekli',
      stateRequired: 'İl/İlçe gerekli',
      postalRequired: 'Posta kodu gerekli',
      countryRequired: 'Ülke gerekli',
      selectShipping: 'Lütfen bir kargo yöntemi seçin',
      selectPayment: 'Lütfen bir ödeme yöntemi seçin',
      kg: 'kg',
      ton: 'ton',
      liter: 'L',
      piece: 'adet',
      iqd: 'IQD',
      usd: 'USD',
      deliveryTitle: 'Teslimat Adresi',
      useSecondaryAddress: 'İkinci Adres Kullan',
      secondaryAddressSelected: 'İkinci adres seçildi:',
      cityLabel: 'Şehir',
      recipientInfoTitle: 'Alıcı Bilgileri',
      recipientInfoLabel: 'Alıcı Bilgileri',
      recipientInfoNote: 'Alıcı müşteriden farklı bir kişiyse bu alanları doldurun',
      recipientNameLabel: 'Alıcı Adı',
      recipientNamePlaceholder: 'Alıcının tam adı',
      recipientPhoneLabel: 'Alıcı Cep Telefonu',
      recipientAddressLabel: 'Teslimat Adresi',
      recipientAddressPlaceholder: 'Tam teslimat adresi',
      secondAddressOrMobile: 'İkinci Adres veya Farklı Telefon Numarası',
      secondAddressNote: 'Farklı bir adres veya telefon numarasına ihtiyacınız varsa bu bölümü doldurun',
      secondAddressOptional: 'İkinci Adres (İsteğe Bağlı)',
      hideButton: 'Gizle',
      addSecondAddress: 'İkinci Adres Ekle',
      secondFullAddressLabel: 'İkinci Tam Adres',
      secondFullAddressPlaceholder: 'İkinci tam teslimat adresi',
      fullAddressLabel: 'Tam Adres',
      secondAddressDeliveryPlaceholder: 'Ürün teslimatı için ikinci adres...',
      provinceLabel: 'İl',
      selectProvincePlaceholder: 'İl Seçin',
      citySelectLabel: 'Şehir',
      selectCityPlaceholder: 'Şehir Seçin',
      postalCodeLabel: 'Posta Kodu',
      postalCodePlaceholder: 'Posta Kodu',
      differentMobileOptional: 'Farklı Telefon Numarası (İsteğe Bağlı)',
      differentMobileLabel: 'Farklı Telefon Numarası',
      addDifferentNumber: 'Farklı Numara Ekle',
      recipientMobileLabel: 'Alıcı Cep Telefonu',
      thisNumberForDelivery: 'Bu numara teslimat iletişimi için kullanılacak',
      mobileForDeliveryContact: 'Bu numara teslimat iletişimi için kullanılacak',
      smsDeliveryConfirmation: 'Bu numara SMS teslimat onayı için kullanılacak',
      postalCodeOptional: 'Posta Kodu (İsteğe Bağlı)',
      shippingMethodTitle: 'Kargo Yöntemi',
      selectShippingLabel: 'Kargo Yöntemi Seçin * (Akıllı Seçim)',
      selectShippingPlaceholder: 'Kargo yöntemi seçin',
      smartSelectionNote: 'Akıllı',
      destination: 'Hedef:',
      weight: 'Ağırlık:',
      basePrice: 'Taban:',
      distance: 'Mesafe:',
      autoCalculate: 'Otomatik Hesapla',
      specifyDestinationCity: '📍 Lütfen hedef şehri belirtin',
      addProductsToCart: '⚖️ Sepete ürün ekleyin',
      erbilCity: 'Erbil',
      heavyTruck: 'Ağır',
      flammableSuffix: ' (Yanıcı Maddeler)',
      warehouseNoteActive: 'Aktif adres:',
      warehouseNoteSecond: 'İkinci adres',
      warehouseNoteCRM: 'CRM adresi',
      warehouseNotePhone: 'Aktif telefon:',
      warehouseNoteDifferentMobile: 'Farklı cep telefonu',
      warehouseNoteCRMPhone: 'CRM telefonu',
      orderCodeAfterCheckout: 'Sipariş kodu ödeme tamamlandıktan sonra verilecek',
      productCode: 'Ürün Kodu:',
      removeFromCart: 'Sepetten kaldır',
      removedFromCartMsg: 'sepetten kaldırıldı',
      defaultAddressInactive: 'Varsayılan Adres (Aktif Değil)',
      defaultAddressCRM: 'Varsayılan Adres (CRM)',
      provinceField: 'İl:',
      cityField: 'Şehir:',
      phoneField: 'Telefon:',
      unknown: 'Bilinmiyor',
      secondAddressOrDifferentMobile: 'İkinci Adres veya Farklı Telefon Numarası',
      orderSummaryTitle: 'Sipariş Özeti',
      itemCount: 'Ürün Sayısı:',
      approximateWeight: 'Tahmini Ağırlık:',
      defaultDeliveryAddress: 'Varsayılan Teslimat Adresi',
      activeDeliveryInfo: 'Aktif Teslimat Adresi ve Bilgileri',
      draggableCardMessage: 'Satın alma siparişi kartı artık tamamen sürüklenebilir!',
      smartVehicleSelectionLabel: 'Seçilen Araç (Akıllı)',
      dragging: '🖱️ Sürükleniyor...',
      draggable: '🖱️ Sürüklenebilir',
      dragToMove: 'Kartı taşımak için tıklayın ve sürükleyin!',
      orderContainsItems: 'Satın alma siparişiniz {count} ürün içeriyor',
      items: 'ürün',
      orderDate: 'Sipariş Tarihi:',
      vehicleTypeLabel: 'Araç Tipi:',
      weightCapacityLabel: 'Ağırlık Kapasitesi:',
      destinationLabel: 'Hedef:',
      baseCostLabel: 'Taban Maliyet:',
      distanceFromErbil: 'Erbil\'den Mesafe:',
      kilometer: 'kilometre',
      autoCalculation: 'Ağırlık ve hedefe göre otomatik hesaplama',
      activeAddress: 'Aktif Adres:',
      recipientPhoneNumber: 'Alıcı Telefon Numarası:',
      infoWillBeUsed: '✅ Bu bilgi sipariş teslimatı için kullanılacak',
      addressNotUsed: '⚠️ Yeni adres veya numara belirtildi - Bu adres kullanılmayacak',
      defaultAddressNote: '💡 Bu adres varsayılan teslimat adresi olarak kullanılacak. Değiştirmek için ikinci adres veya farklı cep numarası girin.',
      secondAddressTitle: 'İkinci Adres veya Farklı Telefon Numarası',
      differentMobileNumberLabel: 'Farklı Telefon Numarası',
      continueShoppingBtn: 'Alışverişe Devam Et',
      clearCartBtn: 'Sepeti Temizle',
      cartClearedTitle: 'Sepet Temizlendi',
      allProductsRemoved: 'Tüm ürünler sepetten kaldırıldı',
      paymentSummaryTitle: 'Ödeme Özeti',
      itemsTotal: 'Ürünler Toplamı:',
      shippingCostSummary: 'Kargo Ücreti:',
      free: 'Ücretsiz',
      valueAddedTax: 'Katma Değer Vergisi (KDV)',
      valueAddedDuty: 'Katma Değer Gümrük Resmi',
      walletUsedSummary: 'Cüzdan Kullanıldı:',
      totalPayable: 'Ödenecek Toplam:',
      freeShippingEligible: '🎉 Ücretsiz kargo hakkı kazandınız!',
      fullyPaidByWallet: '💳 Bu sipariş cüzdanınızla tamamen ödenecek',
    },

    address_selector: {
      deliveryAddressTitle: 'Teslimat Adresi',
      selectAddressDescription: 'Sipariş teslimatı için adres seçin',
      addNewAddress: 'Yeni Adres Ekle',
      addFirstAddress: 'İlk Adresi Ekle',
      updateButton: 'Güncelle',
      cancelButton: 'İptal',
      setAsDefault: 'Varsayılan Olarak Ayarla',
      getLocationButton: 'Mevcut Konumu Al',
      gettingLocation: 'Konum alınıyor...',
      editAddressTitle: 'Adresi Düzenle',
      addAddressTitle: 'Yeni Adres Ekle',
      enterAddressInfo: 'Adres bilgilerini girin',
      addressTitle: 'Adres Başlığı',
      addressTitlePlaceholder: 'ör. Ev, İşyeri',
      recipientNameLabel: 'Alıcı Adı',
      recipientNamePlaceholder: 'Alıcının tam adı',
      recipientNameNote: 'Ad hesabınızdan otomatik dolduruldu',
      fullAddressLabel: 'Tam Adres',
      fullAddressPlaceholder: 'Tam adresinizi girin',
      cityLabel: 'Şehir',
      postalCodeLabel: 'Posta Kodu',
      postalCodePlaceholder: 'İsteğe bağlı',
      gpsLocationLabel: 'GPS Konumu',
      latitudeLabel: 'Enlem:',
      longitudeLabel: 'Boylam:',
      accuracyLabel: 'Doğruluk:',
      metersUnit: 'metre',
      defaultBadge: 'Varsayılan',
      recipientLabel: 'Alıcı:',
      noAddressFound: 'Adres bulunamadı',
      loadingAddresses: 'Yükleniyor...',
      locationReceived: 'Konum Alındı',
      locationReceivedDesc: 'Mevcut konumunuz {accuracy} metre doğrulukla kaydedildi',
      locationError: 'Konum Hatası',
      locationPermissionDenied: 'Konum erişimi reddedildi. Lütfen tarayıcı ayarlarından erişimi etkinleştirin',
      locationUnavailable: 'Konum mevcut değil',
      locationTimeout: 'Konum isteği zaman aşımına uğradı',
      browserNotSupported: 'Tarayıcınız coğrafi konum desteklemiyor',
      addressCreated: 'Yeni adres başarıyla eklendi',
      addressCreateError: 'Adres oluşturma hatası',
      addressUpdated: 'Adres başarıyla güncellendi',
      addressUpdateError: 'Adres güncelleme hatası',
      addressDeleted: 'Adres başarıyla silindi',
      addressDeleteError: 'Adres silme hatası',
      defaultAddressSet: 'Varsayılan adres ayarlandı',
      defaultAddressError: 'Varsayılan adres ayarlama hatası',
      fetchAddressesError: 'Adresler alınırken hata',
      fetchCustomerInfoError: 'Müşteri bilgileri alınırken hata',
      defaultCountry: 'Irak',
    },

    // Common actions
    login: 'Giriş Yap',
    logout: 'Çıkış Yap',
    register: 'Kayıt Ol',
    submit: 'Gönder',
    cancel: 'İptal',
    save: 'Kaydet',
    edit: 'Düzenle',
    delete: 'Sil',
    search: 'Ara',
    loading: 'Yükleniyor...',

    // Product related
    addToCart: 'Sepete Ekle',
    viewDetails: 'Detayları Gör',
    price: 'Fiyat',
    quantity: 'Miktar',
    category: 'Kategori',
    inStock: 'Stokta Var',
    outOfStock: 'Stok Yok',

    // Cart and checkout
    cart: 'Sepet',
    checkout: 'Ödeme',
    total: 'Toplam',
    subtotal: 'Ara Toplam',
    shipping: 'Kargo',
    orderSummary: 'Sipariş Özeti',
    placeOrder: 'Sipariş Ver',

    // User account
    myAccount: 'Hesabım',
    myOrders: 'Siparişlerim',
    profile: 'Profil',
    wallet: 'Cüzdan',
    orderHistory: 'Sipariş Geçmişi',

    // Product Management
    productManagement: {
      categoryRequired: 'Ürün kategorisi gerekli',
      barcodeRequired: 'Barkod alanı gerekli',
      unitPriceRequired: 'Birim fiyat gerekli',
      stockRequired: 'Stok miktarı gerekli',
      minStockRequired: 'Minimum stok seviyesi gerekli',
      maxStockRequired: 'Maksimum stok seviyesi gerekli',
      netWeightRequired: 'Net ağırlık gerekli',
      grossWeightRequired: 'Brüt ağırlık gerekli',
      grossWeightMinError: 'Brüt ağırlık net ağırlıktan büyük veya eşit olmalı',
      minMaxStockError: 'Minimum stok maksimum stoktan büyük olamaz',
      newBatchNumberRequired: 'Yeni parti oluşturmak için parti numarası gerekli',
      batchDeleted: 'Parti silindi',
      batchDeletedDesc: '"{batchNumber}" partisi başarıyla silindi',
      batchDeleteError: 'Parti silme hatası',
      batchDeleteErrorDesc: 'Parti silinemez',
      productUpdated: 'Ürün başarıyla güncellendi',
      productUpdateError: 'Ürün güncelleme başarısız',
      duplicateSKU: 'Yinelenen SKU, lütfen yeni kod girin',
      productDeleted: 'Ürün başarıyla silindi ve mağazadan kaldırıldı',
      productDeleteError: 'Ürün silme başarısız',
      enterNameCategory: 'Lütfen ürün adı ve kategorisi girin',
      imageUploaded: 'Resim {index} başarıyla yüklendi',
      imageUploadError: 'Resim yükleme başarısız',
      barcodeGenerated: 'Otomatik barkod oluşturuldu',
      barcodeGeneratedDesc: 'EAN-13 barkodu oluşturuldu: {barcode}',
      confirmBatchDelete: '"{batchNumber}" partisini silmek istediğinizden emin misiniz?',
      editProduct: 'Mevcut ürün bilgilerini düzenle',
      addNewProduct: 'Kataloğa yeni ürün ekle',
      nonChemicalProduct: 'Kimyasal olmayan ürün',
      nonChemicalDesc: 'Kimyasal olmayan ürün',
      flammableProduct: 'Yanıcı ürün',
      flammableDesc: 'Yanıcı ürün',
      baseInfo: 'Temel ürün bilgileri',
      productName: 'Ürün Adı *',
      productNamePlaceholder: 'Ürün adı girin',
      productNameHelp: 'Ana ürün adını girin',
      categoryLabel: 'Kategori *',
      categoryPlaceholder: 'Kategori seçin',
      categoryHelp: 'Daha iyi sınıflandırma ve arama için ürün kategorisi',
      technicalName: 'Teknik Ad / Sınıf',
      technicalNamePlaceholder: 'Teknik ad veya ürün sınıfı',
      technicalNameHelp: 'Satış kartında gösterilecek teknik ad veya ürün sınıfı',
      description: 'Açıklama',
      descriptionPlaceholder: 'Ürün açıklaması...',
      descriptionHelp: 'Ürün, kullanımları ve özellikleri hakkında tam açıklama',
      identificationPricing: 'Tanımlama ve Fiyatlandırma',
      sku: 'SKU Kodu',
      skuPlaceholder: 'Ürün kodu veya AI kullanın',
      skuPlaceholderView: 'Ürün kodu (sadece görüntüleme)',
      skuHelp: 'Sistem tanımlaması için benzersiz ürün kodu',
      skuHelpView: 'Benzersiz ürün kodu değiştirilemez',
      barcode: 'Barkod',
      barcodePlaceholder: 'Ürün barkodu',
      barcodeHelp: 'Tarama ve satış için ürün barkodu',
      unitPrice: 'Birim Fiyat (IQD) *',
      unitPricePlaceholder: '0',
      unitPriceHelp: 'Birim başına ürün satış fiyatı',
      stock: 'Stok *',
      stockPlaceholder: '0',
      stockPlaceholderEdit: 'Sadece ürün düzenlemede',
      stockHelp: 'Depodaki mevcut ürün miktarı',
      inventoryAddition: 'Envantere ekle',
      inventoryAdditionPlaceholder: '0',
      batchSelection: 'Düzenleme için Parti Seçin',
      batchSelectionPlaceholder: 'Parti seçin...',
      batchOption: '📦 Parti: {batchNumber} - Stok: {stock}',
      addNewBatch: '➕ Yeni parti ekle',
      batchesAvailable: '{barcode} barkodu için {count} parti mevcut',
      selectNewBatch: 'Yeni parti eklemek için "➕ Yeni parti ekle" seçin',
      currentBatchNumber: 'Mevcut parti numarası',
      newBatchNumber: 'Yeni parti numarası',
      batchNumberPlaceholder: 'Parti numarası',
      batchNumberHelp: 'Katalog için yeni parti numarası',
      batchNumberHelpCurrent: 'Mevcut parti numarası - stok bu partiye eklenecek',
      stockWillBeAdded: '✅ Stok bu partiye eklenecek',
      minStock: 'Minimum Stok *',
      minStockPlaceholder: '0',
      minStockHelp: 'Eksiklik uyarısı için minimum stok seviyesi',
      maxStock: 'Maksimum Stok *',
      maxStockPlaceholder: '0',
      maxStockHelp: 'Ürün için maksimum depo depolama kapasitesi',
      weightRow: 'Ağırlık satırı',
      netWeight: 'Net Ağırlık *',
      netWeightPlaceholder: '0',
      netWeightHelp: 'Ambalajsız ürün net ağırlığı',
      netWeightHelpView: 'Ağırlık yalnızca yeni ürün oluştururken değiştirilebilir',
      grossWeight: 'Brüt Ağırlık',
      grossWeightPlaceholder: '0',
      grossWeightHelp: 'Ambalajlı toplam ürün ağırlığı (taşıma için)',
      grossWeightHelpView: 'Ağırlık yalnızca yeni ürün oluştururken değiştirilebilir',
      weightUnit: 'Birim',
      syncWithShop: 'Online mağazada göster',
      showWhenOutOfStock: 'Stok bittiğinde de göster',
      productImages: 'Ürün Resimleri (Maks 3 resim)',
      productImagesFromMain: 'Ürün Resimleri (ana üründen)',
      imagesHelp: 'Katalog ve mağazada gösterilecek maks 3 ürün resmi. JPG, PNG, GIF destekler - Maks 2MB',
      imagesHelpBatch: 'Resimler ana üründen alındı. Gerekirse değiştirebilirsiniz.',
      selectPrimaryImage: 'Birincil resmi seçin:',
      selectPrimaryImageHelp: 'Her resmin sol altındaki daire düğmesine tıklayın (Seçilen resim: {index})',
      selectPrimaryImageHelpDB: 'Resimler veritabanından alındı ve düzenlenebilir (Birincil resim: {index})',
      imageNumber: 'Resim {index}',
      imagePreview: 'Resim önizlemesi {index}',
      setPrimaryImage: 'Birincil resim olarak ayarla {selected}',
      selectImage: 'Resim seçin',
      imageUrlPlaceholder: 'Resim URL {index}',
      productCatalog: 'Ürün Kataloğu (PDF)',
      catalogHelp: 'Ek bilgi için PDF formatında ürün kataloğu veya broşür',
      catalogFile: 'Katalog dosyası',
      selectCatalog: 'Katalog seçin',
      catalogName: 'Katalog dosya adı',
      catalogNamePlaceholder: 'katalog.pdf',
      showToCustomers: 'Müşterilere göster',
      catalogURL: 'Katalog URL',
      catalogURLPlaceholder: 'Katalog URL',
      msds: 'MSDS',
      msdsHelp: 'Güvenlik bilgileri için Malzeme Güvenlik Bilgi Formu',
      msdsFile: 'MSDS dosyası',
      selectMSDS: 'MSDS seçin',
      msdsName: 'MSDS dosya adı',
      msdsNamePlaceholder: 'msds.pdf',
      msdsURL: 'MSDS URL',
      msdsURLPlaceholder: 'MSDS URL',
      updateProduct: 'Ürünü Güncelle',
      addProduct: 'Ürün Ekle',
      confirmDelete: 'Ürün silmeyi onayla',
      confirmDeleteDesc: '"{name}" ürününü silmek istediğinizden emin misiniz?',
      confirmDeleteWarning: 'Bu işlem geri alınamaz ve ürün hem katalog hem de mağaza sistemlerinden silinecek.',
      cancel: 'İptal',
      deleteProduct: 'Ürünü Sil',
      activeBatch: 'Aktif parti (satılıyor):',
      fifoSystem: 'FIFO Sistemi - stoklu en eski parti',
      totalStock: 'Toplam stok: {stock}',
      onlyBatchesWithStock: 'Sadece stoklu partiler',
      deleteBatch: 'Partiyi sil',
      netWeightLabel: 'Net ağırlık:',
      grossWeightLabel: 'Brüt ağırlık:',
      weightLabel: 'Ağırlık:',
      hideFromShop: 'Mağazadan gizle',
      showInShop: 'Mağazada göster',
      manageBatches: 'Partileri Yönet',
      sellingNow: 'Satılıyor',
      inQueue: 'Kuyrukta',
      clickToOpenCatalog: 'Kataloğu açmak için tıklayın',
      clickToOpenMSDS: 'MSDS açmak için tıklayın',
      manualMode: 'Manuel',
      currencyIQD: 'Irak Dinarı (IQD)',
      currencyUSD: 'ABD Doları (USD)',
      currencyEUR: 'Euro (EUR)',
      currencyTRY: 'Türk Lirası (TRY)',
      currentStock: 'Mevcut Stok',
      addStock: 'Stok Ekle',
      onlyForEdit: 'Sadece düzenleme',
      editOnly: 'Sadece mevcut ürün düzenlemede',
      editOnlyPlaceholder: 'Sadece mevcut ürün düzenlemede',
      fileManagement: 'Dosya ve Belge Yönetimi',
      uploadingFile: 'Yükleniyor...',
      viewCatalog: 'Kataloğu Gör',
      uploadCatalog: 'Katalog Yükle',
      viewMSDS: 'MSDS Gör',
      uploadMSDS: 'MSDS Yükle',
      imageUrlsLabel: 'Resim URL\'leri',
      primaryImageLabel: 'Birincil',
      productImagesMain: 'Ürün Resimleri (ana üründen)',
      editableIfNeeded: 'Gerekirse düzenlenebilir',
      imagesFetchedFromMain: 'Resimler ana üründen alındı. Gerekirse değiştirebilirsiniz.',
      imagesFetchedHelp: 'Katalog ve mağazada gösterilecek maks 3 ürün resmi. JPG, PNG, GIF destekler - Maks 2MB',
      imagesFetchedFromDB: 'Resimler veritabanından alındı ve düzenlenebilir (Birincil resim: {index})',
      clickCircleButton: 'Her resmin sol altındaki daire düğmesine tıklayın (Seçilen resim: {index})',
      uploadImage: 'Yükleniyor...',
      clickToSelectPDF: '{type} PDF seçmek için tıklayın',
      onlyPDF: 'Sadece PDF dosyaları',
      incompleteInfo: '⚠️ Eksik Bilgi',
      enterNameCategoryFirst: 'Lütfen önce ürün adı ve kategorisi girin',
      standard13Barcode: '13 haneli standart barkod',
      manualInputPreventsAuto: 'Manuel giriş otomatik oluşturmayı engeller',
      barcode13Placeholder: '13 haneli barkod',
      pricePerUnit: 'Seçilen para biriminde birim başına fiyat',
      stockManagement: 'Stok ve Ağırlık Yönetimi',
      stockRow: 'Stok satırı',
      stockNotEditable: 'Depodaki mevcut ürün stoğu (doğrudan düzenlenemez)',
      initialStockHelp: 'Bu yeni ürün için kayıt edilecek başlangıç stok miktarı',
      stockAdditionHelp: 'Depoya eklemek istediğiniz stok miktarı (sadece mevcut ürün düzenlemede)',
      chemical: 'Kimyasal',
      allBatches: 'Tüm Partiler',
      unit: 'adet',
      units: 'adet',
      editable: 'Düzenlenebilir',
      imagesUploadSection: 'Resim yükleme',
      selectPrimaryImageTitle: 'Birincil resmi seçin',
      imageFromMain: 'Ürün resimleri (ana üründen)',
      maxThreeImages: 'Maks 3 resim',
      catalogActionsButtons: 'Katalog eylem düğmeleri',
      msdsSection: 'MSDS bölümü',
      msdsActionsButtons: 'MSDS eylem düğmeleri',
      msdsSettings: 'MSDS ayarları',
      catalogSettings: 'Katalog ayarları',
      showToCustomersLabel: 'Müşterilere göster',
      showToCustomersHelp: '{type} mağazada indirilebilir',
      hidden: 'Gizli',
      forChemicalOnly: 'Sadece kimyasal ürünler için',
      newBatchField: 'Yeni parti numarası alanı',
      selectBatchForEdit: 'Düzenleme için Parti Seçin',
      selectBatchPlaceholderText: 'Parti seçin...',
      allBatchesCount: 'Tüm Partiler ({count}):',
      totalStockLabel: 'Toplam stok: {stock}',
      onlyWithStock: 'Sadece stoklu partiler',
      batch: 'Parti',
      batchNum: 'Parti {number}',
      initialFixedValue: 'Başlangıç sabit değeri',
      fixedValue: 'Sabit değer',
      selectWeightUnit: 'Birim seçin',
      weightUnitKg: 'Kilogram (kg)',
      weightUnitG: 'Gram (g)',
      weightUnitLb: 'Pound (lb)',
      weightUnitOz: 'Ons (oz)',
      weightUnitT: 'Ton (t)',
      tagsLabel: 'Ürün Etiketleri',
      tagsHelp: 'Etiketleri virgülle ayırın. Bu etiketler mağazada gösterilecek',
      tagsPlaceholder: 'Örnek: kimyasal, endüstriyel, temizleyici',
      showWhenOutOfStockDesc: 'Stok bittiğinde ürünü göster',
      clickToSelectCatalog: 'Katalog PDF seçmek için tıklayın',
      clickToSelectMSDS: 'MSDS PDF seçmek için tıklayın',
      catalogDownloadable: 'Mağazada katalog indirilebilir',
      msdsDownloadable: 'Mağazada MSDS indirilebilir',
      inStock: 'Stokta Var',
      lowStock: 'Düşük Stok',
      outOfStock: 'Stok Yok',
      activeFilters: 'Aktif Filtreler:',
      statusLabel: 'Durum',
      visibilityLabel: 'Görünürlük',
      hiddenProducts: 'Gizli Ürünler',
      visibleProducts: 'Görünür Ürünler',
      searchLabel: 'Ara',
      clearAll: 'Tümünü Temizle',
      totalProducts: 'Toplam Ürünler',
      fileTooLarge: 'Dosya Çok Büyük',
      fileTooLargeDesc: 'Dosya 2MB\'dan küçük olmalı. Lütfen sıkıştırın veya boyutlandırın.',
      invalidFormat: 'Geçersiz Format',
      invalidImageFormat: 'En iyi müşteri görüntüsü için yalnızca JPEG, PNG ve WebP resimleri izin verilir.',
      invalidPDFFormat: 'Belgeler için yalnızca PDF dosyalarına izin verilir.',
      uploadError: 'Yükleme Hatası',
      uploadFailed: 'Dosya yükleme başarısız',
      success: 'Başarılı',
      imageUploadedSuccess: 'Resim başarıyla yüklendi - müşteri görüntüsü için optimize edildi',
      technicalSpecifications: 'Teknik Özellikler',
      technicalSpecificationsPlaceholder: 'Teknik özellikleri JSON veya metin olarak girin...',
      technicalSpecificationsHelp: 'Mağazada müşterilere görünür ürün teknik detayları',
      productFeatures: 'Ürün Özellikleri',
      productFeaturesPlaceholder: 'Ürün özelliklerini girin (her satıra bir tane)',
      productFeaturesHelp: 'Müşterilere görünür temel özellikler - her satıra bir tane',
      productApplications: 'Ürün Uygulamaları',
      productApplicationsPlaceholder: 'Ürün uygulamalarını girin (her satıra bir tane)',
      productApplicationsHelp: 'Yaygın kullanımlar ve uygulamalar - her satıra bir tane',
      batchInfoNotAvailable: 'Parti bilgisi mevcut değil',
      displayMode: 'Ürün Görüntüleme Modu',
      displayModeHelp: 'Müşterilerin bu ürünü mağazada nasıl görüntüleyeceğini seçin',
      displayModeImages: 'Resim Galerisi (3 fotoğraf)',
      displayMode3D: '3D Etkileşimli Model',
      model3dFile: '3D Model Dosyası',
      uploadModel3d: '3D Model Yükle',
      viewModel3d: '3D Model Gör',
      deleteModel3d: '3D Modeli Sil',
      model3dHelp: 'Etkileşimli 3D ürün görüntüleme için GLB veya GLTF dosyası yükleyin (Maks 10MB)',
      model3dFormats: 'Desteklenen formatlar: GLB, GLTF',
      model3dUploaded: '3D model başarıyla yüklendi',
      model3dDeleted: '3D model başarıyla silindi',
      invalidModel3dFormat: '3D modeller için yalnızca GLB ve GLTF dosyalarına izin verilir',
      model3dTooLarge: '3D model dosyası 10MB\'dan küçük olmalı',
      rotate3dModel: 'Döndürmek için sürükleyin',
      zoom3dModel: 'Yakınlaştırmak için kaydırın',
      loading3dModel: '3D model yükleniyor...',
      error3dModel: '3D model yükleme hatası',
      pageTitle: 'Ürün Yönetimi',
      pageSubtitle: 'Ürünleri beş kategori genelinde yönetin',
      backToAdmin: 'Yönetime Dön',
      logout: 'Çıkış Yap',
      searchPlaceholder: 'İsim, barkod veya SKU ile ara...',
      allProducts: 'Tüm Ürünler',
      noProductsFound: 'Ürün bulunamadı',
      noProductsAvailable: 'Kullanılabilir ürün yok',
      noProductsMatch: '"{query}" ile eşleşen ürün yok. İsim, barkod veya SKU ile aramayı deneyin.',
      addFirstProduct: 'Başlamak için ilk ürününüzü ekleyin.',
      clearSearch: 'Aramayı Temizle',
      discontinued: 'Üretimden kalktı',
      unknown: 'Bilinmiyor',
      noBarcode: 'Yok',
      variant: 'Varyant',
      companyLabel: 'Şirket',
      temperatureLabel: 'Taşıma sıcaklığı:',
      temperatureNone: 'Sıcaklık sınırlaması yok',
      temperatureFrozen: 'Dondurulmuş: -18°C ila 0°C',
      temperatureChilled: 'Soğutulmuş: +2°C ila +8°C',
      temperatureCool: 'Serin: +8°C ila +15°C',
      temperatureDry: 'Ortam sıcaklığı (Kuru): 15°C ila 25°C',
      assignVendor: 'Satıcıya Ata (İsteğe Bağlı)',
      assignVendorHelp: 'Bu ürünü isteğe bağlı olarak pazar yeri satıcısına atayın',
      selectVendor: 'Satıcı seçin (isteğe bağlı)',
      noVendor: 'Satıcı Yok (Şirket Ürünü)',
      fileTooLargeTitle: 'Dosya Çok Büyük',
      imageTooLargeDesc: 'Görsel 2 MB\'dan küçük olmalıdır. Lütfen görseli sıkıştırın veya yeniden boyutlandırın.',
      invalidImageFormatDesc: 'En iyi müşteri görüntülemesi için yalnızca JPEG, PNG ve WebP görsellerine izin verilir.',
      imageUploadSuccess: 'Görsel başarıyla yüklendi ve müşteri görüntülemesi için optimize edildi',
      uploadErrorTitle: 'Yükleme Hatası',
      imageUploadFailed: 'Görsel yüklenemedi',
      invalidImageFormatsDesc: 'Yalnızca JPEG, PNG, WEBP ve GIF görsellerine izin verilir.',
      removeImageError: 'Ürün görseli kaldırılamadı',
      imageFileTypes: 'JPG, PNG, WEBP, GIF',
      model3dFileTypes: 'Yalnızca .glb / .gltf dosyaları',
      removeCatalogError: 'Katalog dosyası kaldırılamadı',
      removeMsdsError: 'MSDS dosyası kaldırılamadı',
      catalogFilename: 'catalog.pdf',
      msdsFilename: 'msds.pdf',
      selected: 'Seçili',
      model3dPreview: '3D Model Önizlemesi',
      aiGenerate: 'Yapay Zekâ',
    },

    batchManagement: {
      pageTitle: 'Parti Yönetimi (FIFO)',
      pageSubtitle: 'FIFO sistemiyle ürün partilerini yönetin',
      searchBatches: 'Parti Ara',
      searchDescription: 'Tüm partileri görüntülemek için ürün barkodunu girin',
      barcodeLabel: 'Ürün Barkodu',
      barcodePlaceholder: 'Örnek: 8649677123456',
      searchButton: 'Ara',
      currentSellingBatch: 'Aktif Satış Partisi (LIFO)',
      currentSellingDescription: 'Bu parti şu an satış için seçili',
      batchNumber: 'Parti Numarası',
      stock: 'Stok',
      stockUnits: 'adet',
      productionDate: 'Üretim Tarihi',
      activeStatus: 'Aktif',
      totalBatches: 'Toplam Partiler',
      totalStock: 'Toplam Stok',
      barcode: 'Barkod',
      emptyBatches: 'Boş Partiler',
      batchList: 'Parti Listesi (FIFO)',
      batchListDescription: 'Daha eski partiler önce satılır (İlk Giren, İlk Çıkar)',
      soldOut: 'Tükendi',
      selling: 'Satılıyor',
      waiting: 'Bekliyor',
      price: 'Fiyat',
      netWeight: 'Net Ağırlık',
      batchNotFound: 'Parti Bulunamadı',
      noBatchesMessage: 'Barkod için kayıtlı parti yok',
      loadingBatches: 'Parti bilgileri yükleniyor...',
    },

    // Wallet specific
    walletTitle: 'Müşteri Cüzdanı',
    walletSubtitle: 'Hesap bakiyenizi ve işlemlerinizi yönetin',
    currentBalance: 'Mevcut Bakiye',
    creditLimit: 'Kredi Limiti',
    status: 'Durum',
    lastActivity: 'Son Aktivite',
    addFunds: 'Para Ekle',
    transactions: 'İşlemler',
    rechargeRequests: 'Yükleme Talepleri',
    amount: 'Tutar',
    currency: 'Para Birimi',
    paymentMethod: 'Ödeme Yöntemi',
    paymentReference: 'Ödeme Referansı',
    notes: 'Notlar',
    pending: 'Beklemede',
    completed: 'Tamamlandı',
    rejected: 'Reddedildi',
    active: 'Aktif',
    inactive: 'Pasif',
    credit: 'Alacak',
    debit: 'Borç',
    type: 'Tür',
    description: 'Açıklama',
    date: 'Tarih',
    requestNumber: 'Talep #',
    totalSpent: 'Toplam Harcama',
    totalRecharged: 'Toplam Yükleme',
    noTransactions: 'İşlem bulunamadı',
    noRechargeRequests: 'Yükleme talebi bulunamadı',
    rechargeSuccess: 'Yükleme talebi başarıyla gönderildi',
    optional: 'İsteğe Bağlı',
    bankTransfer: 'Banka Havalesi',
    onlinePayment: 'Online Ödeme',
    cashPayment: 'Nakit Ödeme',
    mobileWallet: 'Mobil Cüzdan',
    processing: 'İşleniyor...',
    allTransactions: 'Tüm İşlemler',
    recentTransactions: 'Son İşlemler',
    quickActions: 'Hızlı İşlemler',
    manageWallet: 'Cüzdanınızı yönetin',
    walletRechargeRequest: 'Cüzdan Yükleme Talebi',
    fillRechargeDetails: 'Cüzdan yüklemesi talep etmek için aşağıdaki bilgileri doldurun',
    enterAmount: 'Tutar girin',
    selectPaymentMethod: 'Ödeme yöntemi seçin',
    iraqiDinar: 'Irak Dinarı (IQD)',
    usDollar: 'ABD Doları (USD)',
    euro: 'Euro (EUR)',
    enterPaymentReference: 'Ödeme referansı girin (isteğe bağlı)',
    enterNotes: 'Not girin (isteğe bağlı)',
    bankReference: 'Banka Referans Numarası',
    enterBankReference: 'Banka referans numarası girin',
    rechargeAmount: 'Yükleme Tutarı',
    bankReceipt: 'Banka Makbuzu',
    rechargeHistory: 'Yükleme Geçmişi',
    uploadBankReceipt: 'Banka makbuzu yükle (JPG, PNG, PDF)',
    bankReceiptRequired: 'Banka havalesi için banka makbuzu gerekli',
    bankReferenceRequired: 'Banka havalesi için banka referans numarası gerekli',
    inputError: 'Giriş Hatası',
    validAmount: 'Lütfen geçerli bir tutar girin',
    requestError: 'Talep Hatası',
    errorCreatingRequest: 'Cüzdan yükleme talebi oluşturma hatası',
    loginToAccessWallet: 'Cüzdanınıza erişmek için lütfen giriş yapın',
    goToLogin: 'Girişe Git',
    totalWithdrawals: 'Toplam çekimler',
    totalDeposits: 'Toplam yüklemeler',
    requestSubmitted: 'Cüzdan yükleme talebiniz başarıyla gönderildi ve onay bekliyor.',
    requestPendingApproval: 'Talep onay bekliyor',

    // Wallet Management (Admin)
    walletHolders: 'Cüzdan Sahipleri',
    walletManagement: 'Cüzdan Yönetimi',
    changeAmount: 'Tutarı Değiştir',
    reason: 'Neden',
    apply: 'Uygula',
    modifyBalance: 'Bakiyeyi Değiştir',
    addSubtractAmount: 'Tutar Ekle/Çıkar',
    reasonForChange: 'Değişiklik Nedeni',
    requestRecharge: 'Yükleme Talep Et',
    allWalletHolders: 'Cüzdanı olan tüm müşteriler',
    noWalletsFound: 'Cüzdan bulunamadı',
    syncWallet: 'Cüzdanı Senkronize Et',

    // Customer Profile
    welcomeCustomer: 'Hoş Geldiniz',
    customerProfile: 'Müşteri Profili',
    manageAccount: 'Hesabınızı yönetin ve sipariş geçmişinizi görüntüleyin',
    editProfile: 'Profili Düzenle',
    continueShopping: 'Alışverişe Devam Et',
    accountInformation: 'Hesap Bilgileri',
    fullName: 'Tam Ad',
    contactDetails: 'İletişim Detayları',
    orderNumber: 'Sipariş Numarası',
    totalAmount: 'Toplam Tutar',
    noOrders: 'Sipariş bulunamadı',
    viewOrder: 'Siparişi Gör',
    orderDate: 'Sipariş Tarihi',
    orderStatus: 'Sipariş Durumu',
    confirmed: 'Onaylandı',
    shipped: 'Kargoya Verildi',
    delivered: 'Teslim Edildi',
    cancelled: 'İptal Edildi',
    logoutSuccessful: 'Çıkış Başarılı',
    logoutSuccessfulDesc: 'Başarıyla çıkış yaptınız',
    logoutError: 'Çıkış sırasında bir hata oluştu',
    error: 'Hata',

    // Forms
    firstName: 'Ad',
    lastName: 'Soyad',
    email: 'E-posta',
    phone: 'Telefon',
    address: 'Adres',
    city: 'Şehir',
    country: 'Ülke',
    company: 'Şirket',

    // Messages
    welcomeMessage: 'Momtazchem\'e Hoş Geldiniz',
    thankYou: 'Teşekkür Ederiz',
    orderConfirmed: 'Siparişiniz onaylandı',
    contactSuccess: 'Mesajınız başarıyla gönderildi',

    // Auth & Login
    auth: {
      login: 'Giriş Yap',
      register: 'Kayıt Ol',
      password: 'Şifre',
      confirmPassword: 'Şifreyi Onayla',
      forgotPassword: 'Şifrenizi mi unuttunuz?',
      loggingIn: 'Giriş yapılıyor...',
      registering: 'Kaydediliyor...',
      welcome: 'Hoş Geldiniz',
      or: 'Veya',
      continueWithGoogle: 'Google ile devam et',
      continueWithFacebook: 'Facebook ile devam et',
      loginSuccess: 'Başarıyla giriş yapıldı',
      invalidCredentials: 'Geçersiz e-posta veya şifre',
      loginError: 'Giriş Hatası',
      serverError: 'Sunucu bağlantı hatası. Lütfen tekrar deneyin',
      networkError: 'Ağ Hatası',
      networkErrorDesc: 'Bağlantı sorunu. Lütfen tekrar deneyin.',
      enterEmail: 'E-postanızı girin',
      enterPassword: 'Şifrenizi girin',
      switchToLogin: 'Girişe Geç',
      customerLogin: 'Müşteri Girişi',
      signInOrRegister: 'Hesabınıza giriş yapın veya yeni hesap oluşturun',
      verifyMobileNumber: 'Cep Telefonu Numarasını Doğrula',
      verificationCodeDescription: 'Cep telefonunuza gönderilen doğrulama kodunu girin',
      smsVerification: 'SMS Doğrulama',
      verificationCodeSent: 'Şu numaraya 4 haneli kod gönderdik:',
      codeSentTo: 'Şu numaraya kod gönderdik:',
      enterVerificationCode: 'Doğrulama Kodunu Girin',
      enterCodePlaceholder: '4 haneli kodu girin',
      enter4DigitCode: '4 haneli kodu girin',
      fourDigitCode: '4 haneli kod',
      sixDigitCode: '6 haneli kod',
      verifying: 'Doğrulanıyor...',
      verifyCode: 'Kodu Doğrula',
      verifyCodes: 'Kodları Doğrula',
      resend: 'Yeniden Gönder',
      back: 'Geri',
      basicInformation: 'Temel Bilgiler',
      contactInformation: 'İletişim Bilgileri',
      addressInformation: 'Adres Bilgileri',
      additionalInformation: 'Ek Bilgiler',
      mobileNumber: 'Cep Telefonu Numarası',
      whatsappNumber: 'WhatsApp Numarası (farklıysa)',
      whatsappDefault: 'Cep telefonu numarasına göre varsayılan',
      whatsappOptional: 'WhatsApp numarası (isteğe bağlı)',
      leaveEmptyIfSame: 'Cep telefonu numarasıyla aynıysa boş bırakın',
      alternatePhone: 'Alternatif Telefon',
      province: 'İl',
      selectProvince: 'İl seçin',
      selectCity: 'Şehir seçin',
      selectCountry: 'Ülke seçin',
      fullAddress: 'Tam adres',
      secondaryAddress: 'İkincil Adres',
      postalCode: 'Posta Kodu',
      industry: 'Sektör',
      businessType: 'İşletme Türü',
      companySize: 'Şirket Büyüklüğü',
      manufacturer: 'Üretici',
      distributor: 'Distribütör',
      retailer: 'Perakendeci',
      endUser: 'Son Kullanıcı',
      small: 'Küçük (1-50 çalışan)',
      medium: 'Orta (51-250 çalışan)',
      large: 'Büyük (251-1000 çalışan)',
      enterprise: 'Kurumsal (1000+ çalışan)',
      communicationPreference: 'İletişim Tercihi',
      preferredLanguage: 'Tercih Edilen Dil',
      english: 'İngilizce',
      arabic: 'Arapça',
      persian: 'Farsça',
      marketingConsent: 'Pazarlama iletişimi almayı kabul ediyorum',
      requiredField: 'Zorunlu alan',
      verificationCodesSent: 'Doğrulama kodları gönderildi',
      verificationCodesError: 'Doğrulama kodları gönderme hatası',
      registrationSuccessful: 'Kayıt Başarılı',
      accountCreated: 'Hesabınız başarıyla oluşturuldu',
      registrationError: 'Kayıt Hatası',
      invalidCodes: 'Geçersiz doğrulama kodları',
      verificationError: 'Kod doğrulama hatası. Lütfen tekrar deneyin',
      smsCodeLabel: 'SMS Doğrulama Kodu',
      emailCodeLabel: 'E-posta Doğrulama Kodu',
      sentTo: 'şuna gönderildi',
      and: 've',
      verify: 'Doğrula',
      emailAlreadyRegistered: 'E-posta Zaten Kayıtlı',
      emailAlreadyRegisteredDesc: 'Bu e-posta zaten kayıtlı. Lütfen giriş yapın.',
      emailAlreadyRegisteredMessage: 'Bu e-posta zaten kayıtlı',
      creatingAccount: 'Hesap oluşturuluyor...',
      createAccount: 'Hesap Oluştur',
      dualVerification: 'Çift Doğrulama',
      verificationCodesSentTo: 'Doğrulama kodları şuraya gönderildi',
      profileUpdated: 'Profil Güncellendi',
      profileUpdatedDesc: 'Profiliniz başarıyla güncellendi',
      updateError: 'Güncelleme Hatası',
      updateFailed: 'Profil güncelleme başarısız',
      registrationVerificationSent: 'Kayıt Başarılı',
      verificationSentDesc: 'Cep telefonu numaranıza doğrulama kodu gönderildi',
      validation: {
        invalidEmail: 'Lütfen geçerli bir e-posta girin',
        passwordMin6: 'Şifre en az 6 karakter olmalı',
        firstNameMin2: 'Ad en az 2 karakter olmalı',
        lastNameMin2: 'Soyad en az 2 karakter olmalı',
        phoneMin10: 'Telefon numarası gerekli',
        countryRequired: 'Ülke gerekli',
        provinceRequired: 'İl gerekli',
        cityRequired: 'Şehir gerekli',
        addressMin5: 'Adres gerekli',
        passwordsMustMatch: 'Şifreler eşleşmeli',
      },
    },

    // Notifications and Toast Messages
    success: 'Başarılı',
    errorOccurred: 'Hata Oluştu',
    warning: 'Uyarı',
    info: 'Bilgi',
    loginSuccessful: 'Giriş Başarılı',
    loginFailed: 'Giriş Başarısız',
    registrationSuccessful: 'Kayıt Başarılı',
    registrationFailed: 'Kayıt Başarısız',
    orderCreated: 'Sipariş Başarıyla Oluşturuldu',
    orderFailed: 'Sipariş Oluşturma Başarısız',
    addedToCart: 'Ürün Sepete Eklendi',
    removedFromCart: 'Ürün Sepetten Kaldırıldı',
    cartCleared: 'Sepet Temizlendi',
    profileUpdated: 'Profil Başarıyla Güncellendi',
    profileUpdateFailed: 'Profil Güncelleme Başarısız',
    passwordChanged: 'Şifre Başarıyla Değiştirildi',
    passwordChangeFailed: 'Şifre Değiştirme Başarısız',
    emailSent: 'E-posta Başarıyla Gönderildi',
    emailFailed: 'E-posta Gönderme Başarısız',
    dataLoaded: 'Veriler Başarıyla Yüklendi',
    dataLoadFailed: 'Veri Yükleme Başarısız',
    unauthorized: 'Yetkisiz',
    unauthorizedDesc: 'Çıkış yaptınız. Tekrar giriş yapılıyor...',
    productNotFound: 'Ürün Bulunamadı',
    networkError: 'Ağ Hatası',
    tryAgain: 'Lütfen tekrar deneyin',
    pleaseWait: 'Lütfen bekleyin...',

    // Product categories
    waterTreatment: 'Su Arıtma',
    fuelAdditives: 'Yakıt Katkıları',
    paintThinner: 'Boya Tineri',
    agriculturalFertilizers: 'Tarım Gübreleri',
    paintSolvents: 'Boya ve Çözücüler',
    industrialChemicals: 'Endüstriyel Kimyasallar',
    technicalEquipment: 'Teknik Ekipman',
    commercialGoods: 'Ticari Mallar',

    // Product category descriptions
    fuelAdditivesDesc: 'Motor verimliliğini artırmak için yüksek performanslı yakıt katkıları',
    waterTreatmentDesc: 'Tüm uygulamalar için kapsamlı su arıtma çözümleri',
    paintSolventsDesc: 'Premium boya formülasyonları ve özel çözücüler',
    agriculturalFertilizersDesc: 'Sürdürülebilir tarım için gelişmiş gübre çözümleri',
    industrialChemicalsDesc: 'Profesyonel endüstriyel kimyasal çözümler',
    paintThinnerDesc: 'Özel boya tinerleri ve ilgili ürünler',
    technicalEquipmentDesc: 'Profesyonel teknik ekipman ve aletler',
    commercialGoodsDesc: 'Ticari mallar ve iş çözümleri',

    // Product Reviews
    productReviews: 'Ürün Yorumları',
    customerReviews: 'Müşteri Yorumları',
    addYourReview: 'Yorumunuzu Ekleyin',
    writeReview: 'Yorum Yaz',
    rating: 'Puan',
    comment: 'Yorum',
    customerName: 'Müşteri Adı',
    submitReview: 'Yorum Gönder',
    reviewSubmitted: 'Yorum Gönderildi',
    reviewSubmittedDesc: 'Yorumunuz başarıyla gönderildi',
    reviewError: 'Yorum Gönderme Hatası',
    reviewErrorDesc: 'Hata',
    loadingReviews: 'Yorumlar yükleniyor...',
    customerReviewTitle: 'Müşteri Yorumu hakkında',
    backToShop: 'Mağazaya Dön',
    averageRating: 'Ortalama Puan',
    totalReviews: 'Toplam Yorumlar',
    noReviewsYet: 'Henüz Yorum Yok',
    noReviewsDesc: 'Bu ürünü ilk yorumlayan siz olun',
    productSpecifications: 'Özellikler',
    reviewsAndRatings: 'Yorumlar ve Puanlar',
    customerFeedback: 'Müşteri Geri Bildirimleri',
    productReviewsFor: 'Ürün Yorumları:',
    totalReviewsCount: 'Toplam Yorumlar',
    loginToReview: 'Yorum Göndermek İçin Giriş Yapın',
    loginToReviewDesc: 'Yorum göndermek ve ürünleri puanlamak için lütfen önce hesabınıza giriş yapın',
    reviewingAs: 'Şu olarak yorum yapıyorsunuz:',
    yourPreviousReview: 'Önceki Yorumunuz:',
    editReview: 'Yorumu Düzenle',
    postedOn: 'Yayınlanma tarihi:',
    editYourReview: 'Yorumunuzu düzenleyin...',
    updateReview: 'Yorumu Güncelle',
    beFirstToReview: 'İlk yorumlayan siz olun',
    you: '(Siz)',
    reviewUpdated: 'Yorum Başarıyla Güncellendi',
    reviewUpdatedDesc: 'Değişiklikleriniz kaydedildi',
    review: 'yorum',
    reviews: 'yorumlar',

    // Footer
    aboutCompany: 'Şirket Hakkında',
    contactInfo: 'İletişim Bilgileri',
    followUs: 'Bizi Takip Edin',
    allRightsReserved: 'Tüm Hakları Saklıdır',

    // Home Page - Hero Section
    advancedChemical: 'Gelişmiş Kimyasal',
    solutions: 'Çözümler',
    forIndustry: 'Endüstri İçin',
    heroDescription: 'Premium yakıt katkıları, su arıtma sistemleri, boya ve tiner ürünleri ile küresel endüstriler için tarım gübreleri üretiminde önde gelen üretici.',
    exploreProducts: 'Ürünleri Keşfet',
    contactSales: 'Satışla İletişim',
    callForPrice: 'Fiyat İçin İletişime Geçin',

    // Home Page - Products
    ourProductPortfolio: 'Ürün Portföyümüz',
    productPortfolioDesc: 'Performans ve güvenilirlik için tasarlanmış dört temel sektörde kapsamlı kimyasal çözümler.',
    products_plural: 'Ürünler',
    availableProducts: 'Mevcut Ürünler:',
    moreProducts: 'daha fazla ürün',
    viewAll: 'Tümünü Gör',
    aboutMomtazchem: 'Momtazchem Hakkında',
    aboutMomtazchemDesc1: '25 yılı aşkın kimyasal üretim deneyimiyle Momtazchem, dünya genelinde endüstriler için güvenilir bir ortak olarak kendini kanıtlamıştır. Yenilik, kalite ve sürdürülebilirlik konusundaki kararlılığımız her şeyi yönlendirir.',
    aboutMomtazchemDesc2: 'En modern tesislerimizde yakıt, su arıtma, boya ve tarım sektörlerinin gelişen ihtiyaçlarını karşılayan yüksek kaliteli kimyasal çözümler geliştirip üretiyoruz.',
    learnMoreAboutUs: 'Hakkımızda Daha Fazla Bilgi',
    customerSatisfaction: 'Müşteri Memnuniyeti',
    ourServicesCapabilities: 'Hizmetlerimiz ve Yeteneklerimiz',
    servicesCapabilitiesDesc: 'Araştırma ve geliştirmeden teslimat ve teknik yardıma kadar kapsamlı destek.',
    rdServices: 'Ar-Ge Hizmetleri',
    rdServicesDesc: 'Belirli endüstri gereksinimlerini karşılamak için özel formülasyon geliştirme ve ürün optimizasyonu.',
    customFormulations: 'Özel Formülasyonlar',
    productTesting: 'Ürün Testi',
    performanceAnalysis: 'Performans Analizi',
    globalDistribution: 'Küresel Dağıtım',
    globalDistributionDesc: 'Dünya genelinde zamanında teslimat sağlayan güvenilir tedarik zinciri ve lojistik ağı.',
    countries40Plus: '40+ Ülke',
    expressShipping: 'Hızlı Kargo',
    bulkOrders: 'Toplu Siparişler',
    technicalSupport: 'Teknik Destek',
    technicalSupportDesc: 'Optimum ürün uygulama ve performansı için uzman teknik yardım ve danışmanlık.',
    support24_7: '7/24 Destek',
    applicationTraining: 'Uygulama Eğitimi',
    documentation: 'Dokümantasyon',

    // About page
    aboutTitle: 'Momtazchem Hakkında',
    aboutSubtitle: '25 yılı aşkın süredir yenilik, kalite ve sürdürülebilirlikle kimya sektörüne liderlik ediyoruz.',
    ourStory: 'Hikayemiz',
    ourMission: 'Misyonumuz',
    ourVision: 'Vizyonumuz',
    ourCoreValues: 'Temel Değerlerimiz',
    valuesSubtitle: 'Her gün kararlarımızı yönlendiren ve kültürümüzü şekillendiren ilkeler.',
    ourTeamExpertise: 'Ekibimiz ve Uzmanlığımız',
    certificationsCompliance: 'Sertifikalar ve Uyumluluk',
    certificationsSubtitle: 'Kalite, güvenlik ve çevresel sorumluluk sağlamak için en yüksek endüstri standartlarını ve sertifikalarını koruyoruz.',

    // About content
    storyParagraph1: '1999\'da kurulan Momtazchem, dünya genelindeki endüstrilere yüksek kaliteli kimyasal çözümler sunma vizyonuyla küçük bir kimyasal üretim şirketi olarak başladı. Son 25 yılda dört temel pazar segmentine hizmet eden önde gelen bir üretici haline geldik.',
    storyParagraph2: 'Yolculuğumuz sürekli yenilik, stratejik genişleme ve kaliteye kararlı bağlılıkla şekillenmiştir. Bugün en modern üretim tesislerimizi işletmekte ve 40\'tan fazla ülkede müşterilere hizmet vermekteyiz.',
    storyParagraph3: 'Geleceğe bakışımızda kimya bilimini geliştirmeye, müşterilerimizin başarısını desteklemeye ve daha sürdürülebilir bir dünyaya katkıda bulunmaya kararlı olmaya devam ediyoruz.',
    missionText: 'Endüstriyel süreçleri geliştiren, ürün performansını artıran ve en yüksek kalite ve güvenlik standartlarını korurken sürdürülebilir kalkınmaya katkıda bulunan yenilikçi kimyasal çözümler geliştirmek ve üretmek.',
    visionText: 'Yenilikçiliğimiz, sürdürülebilirliğimiz ve gelecek nesiller için çevreyi korurken endüstrileri geliştirme konusundaki kararlılığımızla tanınan, kimyasal çözümlerde dünyanın en güvenilir ortağı olmak.',
    teamText: 'Başarımız ekibimizin uzmanlığı ve özveri üzerine kuruludur. Kimya mühendisleri, araştırma bilimcileri, kalite uzmanları ve sektör uzmanları dahil 500\'den fazla profesyonel istihdam ediyoruz.',

    // Values
    qualityExcellence: 'Kalite Mükemmelliği',
    qualityExcellenceDesc: 'ISO sertifikalarıyla tutarlı kaliteyi sağlayarak tüm ürün ve süreçlerimizde en yüksek standartları koruyoruz.',
    sustainability: 'Sürdürülebilirlik',
    sustainabilityDesc: 'Sürdürülebilir uygulamalara ve çevresel açıdan sorumlu çözümlere bağlıyız',
    environmentalResponsibility: 'Çevresel Sorumluluk',
    environmentalResponsibilityDesc: 'Sürdürülebilir üretim uygulamalarına ve çevre dostu kimyasal çözümler geliştirmeye bağlıyız.',
    customerFocus: 'Müşteri Odaklılık',
    customerFocusDesc: 'Müşterilerimizin başarısı önceliğimizdir. Özelleştirilmiş çözümler ve olağanüstü hizmet sunuyoruz.',
    globalReach: 'Küresel Erişim',
    globalReachDesc: 'Güvenilir tedarik zincirleri ve yerel destekle 40\'tan fazla ülkede müşterilere hizmet veriyoruz.',

    // Stats
    employees: 'Çalışanlar',
    rdScientists: 'Ar-Ge Bilimcileri',
    manufacturingSites: 'Üretim Tesisleri',
    qualityRate: 'Kalite Oranı',

    // Certifications
    iso9001: 'ISO 9001:2015',
    iso9001Desc: 'Kalite Yönetim Sistemleri',
    iso14001: 'ISO 14001',
    iso14001Desc: 'Çevre Yönetimi',
    ohsas18001: 'OHSAS 18001',
    ohsas18001Desc: 'İş Sağlığı ve Güvenliği',
    reachCompliance: 'REACH Uyumluluğu',
    reachComplianceDesc: 'Avrupa Kimyasallar Yönetmeliği',

    // Product Form
    addProduct: 'Ürün Ekle',
    editProduct: 'Ürünü Düzenle',
    productName: 'Ürün Adı',
    shortDescription: 'Kısa Açıklama',
    productDescription: 'Ürün Açıklaması',
    priceRange: 'Fiyat Aralığı',
    productCategory: 'Ürün Kategorisi',
    productFeatures: 'Ürün Özellikleri',
    productApplications: 'Ürün Uygulamaları',
    productTags: 'Ürün Etiketleri',
    productImage: 'Ürün Resmi',
    productCatalog: 'Ürün Kataloğu',
    msdsDocument: 'MSDS Belgesi',
    stockQuantity: 'Stok Miktarı',
    minStockLevel: 'Minimum Stok Seviyesi',
    maxStockLevel: 'Maksimum Stok Seviyesi',
    unitPrice: 'Birim Fiyat',
    netWeight: 'Net Ağırlık',
    grossWeight: 'Brüt Ağırlık',
    weightUnit: 'Ağırlık Birimi',
    batchNumber: 'Parti Numarası',
    productSku: 'Ürün SKU',
    productBarcode: 'Ürün Barkodu',
    isVariant: 'Ürün Varyantı mı',
    parentProduct: 'Ana Ürün',
    variantType: 'Varyant Türü',
    variantValue: 'Varyant Değeri',
    syncWithShop: 'Mağaza ile Senkronize Et',
    showWhenOutOfStock: 'Stok Bittiğinde Göster',
    showCatalogToCustomers: 'Kataloğu Müşterilere Göster',
    showMsdsToCustomers: 'MSDS\'yi Müşterilere Göster',
    basicInfo: 'Temel Bilgiler',
    pricingInventory: 'Fiyatlandırma ve Envanter',
    documentsMedia: 'Belgeler ve Medya',
    variantSettings: 'Varyant Ayarları',
    shopSettings: 'Mağaza Ayarları',
    weightsAndBatch: 'Ağırlıklar ve Parti',
    productDetails: 'Ürün Detayları',

    // Contact Page
    contactPage: {
      firstName: 'Ad',
      lastName: 'Soyad',
      emailAddress: 'E-posta Adresi',
      company: 'Şirket',
      productInterest: 'İlgilenilen Ürün',
      message: 'Mesaj',
      firstNamePlaceholder: 'Ahmet',
      lastNamePlaceholder: 'Yılmaz',
      emailPlaceholder: 'ahmet@sirket.com',
      companyPlaceholder: 'Şirketiniz',
      productInterestPlaceholder: 'Bir ürün kategorisi seçin',
      messagePlaceholder: 'Gereksinimlerinizi bize anlatın...',
      waterTreatment: 'Su Arıtma',
      fuelAdditives: 'Yakıt Katkıları',
      paintThinner: 'Boya ve Tiner',
      agriculturalFertilizers: 'Tarım Gübreleri',
      industrialChemicals: 'Endüstriyel Kimyasallar',
      technicalEquipment: 'Teknik Ekipman',
      commercialGoods: 'Ticari Mallar',
      customSolutions: 'Özel Çözümler',
      sending: 'Gönderiliyor...',
      sendMessage: 'Mesaj Gönder',
      messageSent: 'Mesaj Başarıyla Gönderildi',
      messageSentDesc: 'Talebiniz için teşekkür ederiz. 24 saat içinde size geri döneceğiz.',
      errorTitle: 'Hata',
      errorDesc: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.',
      contactInformation: 'İletişim Bilgileri',
      ourCertifications: 'Sertifikalarımız',
      findUs: 'Bizi Bulun',
      visitHeadquarters: 'Genel merkezimizi ve üretim tesislerimizi ziyaret edin',
      getDirections: 'Yol Tarifi Al',
      viewInMaps: 'Google Haritalar\'da Gör',
    },

    // Services Page
    servicesPage: {
      title: 'Hizmetlerimiz ve Yeteneklerimiz',
      subtitle: 'Araştırma ve geliştirmeden teslimat ve teknik yardıma kadar kapsamlı destek, her adımda başarınızı sağlar.',
      rdTitle: 'Araştırma ve Geliştirme',
      rdDesc: 'Özel gereksinimlerinizi karşılamak için özel formülasyon geliştirme ve ürün optimizasyonu.',
      rdFeature1: 'Özel Kimyasal Formülasyonlar',
      rdFeature2: 'Ürün Performans Testi',
      rdFeature3: 'Mevzuat Uyumu Desteği',
      rdFeature4: 'Laboratuvardan Üretime Ölçeklendirme',
      rdFeature5: 'Kalite Optimizasyonu',
      rdFeature6: 'Uygulama Geliştirme',
      distributionTitle: 'Küresel Dağıtım',
      distributionDesc: 'Dünya genelinde zamanında teslimat sağlayan güvenilir tedarik zinciri ve lojistik ağı.',
      distFeature1: '40+ Ülke Kapsama',
      distFeature2: 'Hızlı Kargo Seçenekleri',
      distFeature3: 'Toplu Sipariş İşleme',
      distFeature4: 'Soğuk Zincir Yönetimi',
      distFeature5: 'Gerçek Zamanlı Takip',
      distFeature6: 'Yerel Depolama',
      techSupportTitle: 'Teknik Destek',
      techSupportDesc: 'Optimum ürün uygulaması için uzman teknik yardım ve danışmanlık.',
      techFeature1: '7/24 Teknik Yardım Hattı',
      techFeature2: 'Uygulama Eğitimi',
      techFeature3: 'Sorun Giderme Desteği',
      techFeature4: 'Performans Optimizasyonu',
      techFeature5: 'Güvenlik Kılavuzları',
      techFeature6: 'Dokümantasyon Desteği',
      consultingTitle: 'Danışmanlık Hizmetleri',
      consultingDesc: 'Kimyasal süreçlerinizi ve operasyonlarınızı optimize etmenize yardımcı olacak stratejik danışmanlık.',
      consultFeature1: 'Süreç Optimizasyonu',
      consultFeature2: 'Maliyet Azaltma Analizi',
      consultFeature3: 'Sürdürülebilirlik Değerlendirmesi',
      consultFeature4: 'Mevzuat Rehberliği',
      consultFeature5: 'Pazar Analizi',
      consultFeature6: 'Stratejik Planlama',
      qaTitle: 'Kalite Güvencesi',
      qaDesc: 'Tüm ürünlerimiz için kapsamlı kalite kontrol ve güvence programları.',
      qaFeature1: 'ISO Sertifikalı Süreçler',
      qaFeature2: 'Parti Testi ve Analizi',
      qaFeature3: 'Analiz Sertifikası',
      qaFeature4: 'Kalite Dokümantasyonu',
      qaFeature5: 'Mevzuat Uyumu',
      qaFeature6: 'Sürekli İzleme',
      customMfgTitle: 'Özel Üretim',
      customMfgDesc: 'Özel kimyasal gereksinimler için özelleştirilmiş üretim çözümleri.',
      customFeature1: 'Sözleşmeli Üretim',
      customFeature2: 'Özel Etiketleme',
      customFeature3: 'Esnek Parti Boyutları',
      customFeature4: 'Özel Formülasyonlar',
      customFeature5: 'Ambalaj Çözümleri',
      customFeature6: 'Tedarik Zinciri Entegrasyonu',
      coreCapabilities: 'Temel Yeteneklerimiz',
      coreCapabilitiesDesc: 'Onlarca yıllık deneyim ve son teknoloji ile destekleniyor',
      advManufacturing: 'Gelişmiş Üretim',
      advManufacturingDesc: 'Modern ekipman ve otomasyonlu son teknoloji tesisler',
      qualityControl: 'Kalite Kontrol',
      qualityControlDesc: 'Her aşamada titiz test ve kalite güvencesi',
      globalReachCap: 'Küresel Erişim',
      globalReachCapDesc: 'Dünya genelinde 40\'tan fazla ülkede müşterilere hizmet veriyoruz',
      expertTeam: 'Uzman Ekip',
      expertTeamDesc: '50\'den fazla Ar-Ge bilimcisi ve kimya mühendisliği uzmanı',
      serviceProcess: 'Hizmet Sürecimiz',
      serviceProcessDesc: 'İlk danışmanlıktan süregelen desteğe kadar her adımda yanınızdayız',
      consultation: 'Danışmanlık',
      consultationDesc: 'Özel gereksinimlerinizi ve zorluklarınızı anlama',
      development: 'Geliştirme',
      developmentDesc: 'Özel formülasyon ve çözüm geliştirme',
      testing: 'Test',
      testingDesc: 'Titiz test ve kalite doğrulama',
      delivery: 'Teslimat',
      deliveryDesc: 'Üretim, teslimat ve süregelen destek',
      readyToStart: 'Başlamaya Hazır mısınız?',
      contactExpertsDesc: 'Kimyasal çözüm ihtiyaçlarınızı görüşmek ve işletmenizin başarısına nasıl yardımcı olabileceğimizi keşfetmek için uzman ekibimizle iletişime geçin.',
      contactSales: 'Satış Ekibiyle İletişim',
      requestQuote: 'Fiyat Teklifi İste',
      contactSalesTitle: 'Satış Ekibiyle İletişim',
      fullName: 'Tam Ad',
      emailAddress: 'E-posta Adresi',
      companyName: 'Şirket',
      phoneNumber: 'Telefon Numarası',
      message: 'Mesaj',
      messagePlaceholder: 'Gereksinimlerinizi bize anlatın...',
      cancel: 'İptal',
      sendMessage: 'Mesaj Gönder',
      sending: 'Gönderiliyor...',
      requestQuoteTitle: 'Fiyat Teklifi İste',
      productCategory: 'Ürün Kategorisi',
      productCategoryPlaceholder: 'ör. Tarım Gübreleri, Su Arıtma, vb.',
      requiredQuantity: 'Gerekli Miktar',
      quantityPlaceholder: 'ör. 500 kg, 10 ton',
      requiredTimeline: 'Gerekli Zaman Çizelgesi',
      timelinePlaceholder: 'ör. 2 hafta içinde',
      productSpecs: 'Ürün Özellikleri',
      specsPlaceholder: 'Lütfen ayrıntılı özellikler, saflık gereksinimleri, ambalaj tercihleri vb. belirtin.',
      additionalReqs: 'Ek Gereksinimler',
      additionalPlaceholder: 'Herhangi bir ek bilgi veya özel gereksinimler...',
      submitQuote: 'Fiyat Teklifi Talebini Gönder',
      submitting: 'Gönderiliyor...',
      messageSent: 'Mesaj Başarıyla Gönderildi',
      messageSentDesc: 'Satış ekibimiz 24 saat içinde sizinle iletişime geçecek.',
      quoteSubmitted: 'Fiyat Teklifi Talebi Gönderildi',
      quoteSubmittedDesc: 'Ekibimiz teklifinizi hazırlayıp 24 saat içinde yanıt verecek.',
      errorTitle: 'Hata',
      messageFailed: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.',
      quoteFailed: 'Fiyat teklifi talebi gönderilemedi. Lütfen tekrar deneyin.',
    },
  },
} as Record<Exclude<Language, 'fa'>, Translation>;

// Persian uses English as a safe fallback for translation keys that have not
// yet been added to the Persian catalog. Core customer-facing labels are
// overridden here so selecting Persian never produces an empty interface.
export const translations = {
  ...baseTranslations,
  fa: {
  ...baseTranslations.en,
  home: 'خانه',
  about: 'درباره ما',
  services: 'خدمات',
  products: 'محصولات',
  contact: 'تماس با ما',
  productManagement: {
    categoryRequired: 'انتخاب دسته‌بندی محصول الزامی است',
    barcodeRequired: 'وارد کردن بارکد الزامی است',
    unitPriceRequired: 'وارد کردن قیمت واحد الزامی است',
    stockRequired: 'وارد کردن مقدار موجودی الزامی است',
    minStockRequired: 'وارد کردن حداقل موجودی الزامی است',
    maxStockRequired: 'وارد کردن حداکثر موجودی الزامی است',
    netWeightRequired: 'وارد کردن وزن خالص الزامی است',
    grossWeightRequired: 'وارد کردن وزن ناخالص الزامی است',
    grossWeightMinError: 'وزن ناخالص باید بزرگ‌تر یا مساوی وزن خالص باشد',
    minMaxStockError: 'حداقل موجودی نمی‌تواند بیشتر از حداکثر موجودی باشد',
    newBatchNumberRequired: 'برای ایجاد بچ جدید، وارد کردن شماره بچ الزامی است',
    batchDeleted: 'بچ حذف شد',
    batchDeletedDesc: 'بچ «{batchNumber}» با موفقیت حذف شد',
    batchDeleteError: 'خطا در حذف بچ',
    batchDeleteErrorDesc: 'امکان حذف بچ وجود ندارد',
    productUpdated: 'محصول با موفقیت به‌روزرسانی شد',
    productUpdateError: 'به‌روزرسانی محصول ناموفق بود',
    duplicateSKU: 'SKU تکراری است؛ لطفاً کد دیگری وارد کنید',
    productDeleted: 'محصول با موفقیت حذف و از فروشگاه برداشته شد',
    productDeleteError: 'حذف محصول ناموفق بود',
    enterNameCategory: 'لطفاً نام و دسته‌بندی محصول را وارد کنید',
    imageUploaded: 'تصویر {index} با موفقیت بارگذاری شد',
    imageUploadError: 'بارگذاری تصویر ناموفق بود',
    barcodeGenerated: 'بارکد به‌صورت خودکار ایجاد شد',
    barcodeGeneratedDesc: 'بارکد EAN-13 ایجاد شد: {barcode}',
    confirmBatchDelete: 'آیا از حذف بچ «{batchNumber}» مطمئن هستید؟',
    editProduct: 'ویرایش اطلاعات محصول موجود',
    addNewProduct: 'افزودن محصول جدید به کاتالوگ',
    nonChemicalProduct: 'محصول غیرشیمیایی',
    nonChemicalDesc: 'این محصول غیرشیمیایی است',
    flammableProduct: 'محصول قابل اشتعال',
    flammableDesc: 'این محصول قابل اشتعال است',
    baseInfo: 'اطلاعات پایه محصول',
    productName: 'نام محصول *',
    productNamePlaceholder: 'نام محصول را وارد کنید',
    productNameHelp: 'نام اصلی محصول را وارد کنید',
    categoryLabel: 'دسته‌بندی *',
    categoryPlaceholder: 'دسته‌بندی را انتخاب کنید',
    categoryHelp: 'دسته‌بندی محصول برای طبقه‌بندی و جستجوی بهتر',
    technicalName: 'نام فنی / گرید',
    technicalNamePlaceholder: 'نام فنی یا گرید محصول',
    technicalNameHelp: 'نام فنی یا گرید محصول برای نمایش روی کارت فروش',
    description: 'توضیحات',
    descriptionPlaceholder: 'توضیحات محصول...',
    descriptionHelp: 'توضیحات کامل درباره محصول، کاربردها و ویژگی‌های آن',
    identificationPricing: 'شناسایی و قیمت‌گذاری',
    sku: 'کد SKU',
    skuPlaceholder: 'کد محصول یا استفاده از هوش مصنوعی',
    skuPlaceholderView: 'کد محصول (فقط مشاهده)',
    skuHelp: 'کد یکتای محصول برای شناسایی در سامانه',
    skuHelpView: 'کد یکتای محصول قابل تغییر نیست',
    barcode: 'بارکد',
    barcodePlaceholder: 'بارکد محصول',
    barcodeHelp: 'بارکد محصول برای اسکن و فروش',
    unitPrice: 'قیمت واحد (IQD) *',
    unitPricePlaceholder: '۰',
    unitPriceHelp: 'قیمت فروش محصول به ازای هر واحد',
    stock: 'موجودی *',
    stockPlaceholder: '۰',
    stockPlaceholderEdit: 'فقط هنگام ویرایش محصول',
    stockHelp: 'مقدار موجود محصول در انبار',
    inventoryAddition: 'افزودن به موجودی',
    inventoryAdditionPlaceholder: '۰',
    batchSelection: 'انتخاب بچ برای ویرایش',
    batchSelectionPlaceholder: 'بچ را انتخاب کنید...',
    batchOption: '📦 بچ: {batchNumber} - موجودی: {stock}',
    addNewBatch: '➕ افزودن بچ جدید',
    batchesAvailable: '{count} بچ برای بارکد {barcode} موجود است',
    selectNewBatch: 'برای افزودن بچ جدید، «➕ افزودن بچ جدید» را انتخاب کنید',
    currentBatchNumber: 'شماره بچ فعلی',
    newBatchNumber: 'شماره بچ جدید',
    batchNumberPlaceholder: 'شماره بچ',
    batchNumberHelp: 'شماره بچ جدید برای کاتالوگ',
    batchNumberHelpCurrent: 'شماره بچ فعلی؛ موجودی به این بچ اضافه می‌شود',
    stockWillBeAdded: '✅ موجودی به این بچ اضافه خواهد شد',
    minStock: 'حداقل موجودی *',
    minStockPlaceholder: '۰',
    minStockHelp: 'حداقل موجودی برای هشدار کمبود',
    maxStock: 'حداکثر موجودی *',
    maxStockPlaceholder: '۰',
    maxStockHelp: 'حداکثر ظرفیت انبار برای محصول',
    weightRow: 'ردیف وزن',
    netWeight: 'وزن خالص *',
    netWeightPlaceholder: '۰',
    netWeightHelp: 'وزن خالص محصول بدون بسته‌بندی',
    netWeightHelpView: 'وزن فقط هنگام ایجاد محصول جدید قابل تغییر است',
    grossWeight: 'وزن ناخالص',
    grossWeightPlaceholder: '۰',
    grossWeightHelp: 'وزن کل محصول همراه بسته‌بندی (برای حمل‌ونقل)',
    grossWeightHelpView: 'وزن فقط هنگام ایجاد محصول جدید قابل تغییر است',
    weightUnit: 'واحد',
    syncWithShop: 'نمایش در فروشگاه آنلاین',
    showWhenOutOfStock: 'نمایش حتی هنگام اتمام موجودی',
    productImages: 'تصاویر محصول (حداکثر ۳ تصویر)',
    productImagesFromMain: 'تصاویر محصول (از محصول اصلی)',
    imagesHelp: 'حداکثر ۳ تصویر برای نمایش در کاتالوگ و فروشگاه. فرمت‌های JPG، PNG و GIF - حداکثر ۲ مگابایت',
    imagesHelpBatch: 'تصاویر از محصول اصلی دریافت شده‌اند. در صورت نیاز می‌توانید آن‌ها را تغییر دهید.',
    selectPrimaryImage: 'تصویر اصلی را انتخاب کنید:',
    selectPrimaryImageHelp: 'روی دکمه دایره‌ای پایینِ سمت چپ هر تصویر کلیک کنید (تصویر انتخاب‌شده: {index})',
    selectPrimaryImageHelpDB: 'تصاویر از پایگاه داده دریافت و قابل ویرایش هستند (تصویر اصلی: {index})',
    imageNumber: 'تصویر {index}',
    imagePreview: 'پیش‌نمایش تصویر {index}',
    setPrimaryImage: 'انتخاب به‌عنوان تصویر اصلی {selected}',
    selectImage: 'انتخاب تصویر',
    imageUrlPlaceholder: 'نشانی تصویر {index}',
    productCatalog: 'کاتالوگ محصول (PDF)',
    catalogHelp: 'کاتالوگ یا بروشور محصول با فرمت PDF برای اطلاعات بیشتر',
    catalogFile: 'فایل کاتالوگ',
    selectCatalog: 'انتخاب کاتالوگ',
    catalogName: 'نام فایل کاتالوگ',
    catalogNamePlaceholder: 'catalog.pdf',
    showToCustomers: 'نمایش به مشتریان',
    catalogURL: 'نشانی کاتالوگ',
    catalogURLPlaceholder: 'نشانی کاتالوگ',
    msds: 'MSDS',
    msdsHelp: 'برگه اطلاعات ایمنی مواد برای اطلاعات ایمنی',
    msdsFile: 'فایل MSDS',
    selectMSDS: 'انتخاب MSDS',
    msdsName: 'نام فایل MSDS',
    msdsNamePlaceholder: 'msds.pdf',
    msdsURL: 'نشانی MSDS',
    msdsURLPlaceholder: 'نشانی MSDS',
    updateProduct: 'به‌روزرسانی محصول',
    addProduct: 'افزودن محصول',
    confirmDelete: 'تأیید حذف محصول',
    confirmDeleteDesc: 'آیا از حذف محصول «{name}» مطمئن هستید؟',
    confirmDeleteWarning: 'این عملیات برگشت‌پذیر نیست و محصول از کاتالوگ و فروشگاه حذف خواهد شد.',
    cancel: 'لغو',
    deleteProduct: 'حذف محصول',
    activeBatch: 'بچ فعال (در حال فروش):',
    fifoSystem: 'سامانه FIFO - قدیمی‌ترین بچ دارای موجودی',
    totalStock: 'موجودی کل: {stock}',
    onlyBatchesWithStock: 'فقط بچ‌های دارای موجودی',
    deleteBatch: 'حذف بچ',
    netWeightLabel: 'وزن خالص:',
    grossWeightLabel: 'وزن ناخالص:',
    weightLabel: 'وزن:',
    hideFromShop: 'پنهان کردن از فروشگاه',
    showInShop: 'نمایش در فروشگاه',
    manageBatches: 'مدیریت بچ‌ها',
    sellingNow: 'در حال فروش',
    inQueue: 'در صف',
    clickToOpenCatalog: 'برای باز کردن کاتالوگ کلیک کنید',
    clickToOpenMSDS: 'برای باز کردن MSDS کلیک کنید',
    manualMode: 'دستی',
    currencyIQD: 'دینار عراق (IQD)',
    currencyUSD: 'دلار آمریکا (USD)',
    currencyEUR: 'یورو (EUR)',
    currencyTRY: 'لیر ترکیه (TRY)',
    currentStock: 'موجودی فعلی',
    addStock: 'افزودن موجودی',
    onlyForEdit: 'فقط برای ویرایش',
    editOnly: 'فقط هنگام ویرایش محصول موجود',
    editOnlyPlaceholder: 'فقط هنگام ویرایش محصول موجود',
    fileManagement: 'مدیریت فایل و سند',
    uploadingFile: 'در حال بارگذاری...',
    viewCatalog: 'مشاهده کاتالوگ',
    uploadCatalog: 'بارگذاری کاتالوگ',
    viewMSDS: 'مشاهده MSDS',
    uploadMSDS: 'بارگذاری MSDS',
    imageUrlsLabel: 'نشانی‌های تصاویر',
    primaryImageLabel: 'اصلی',
    productImagesMain: 'تصاویر محصول (از محصول اصلی)',
    editableIfNeeded: 'در صورت نیاز قابل ویرایش',
    imagesFetchedFromMain: 'تصاویر از محصول اصلی دریافت شده‌اند. در صورت نیاز می‌توانید آن‌ها را تغییر دهید.',
    imagesFetchedHelp: 'حداکثر ۳ تصویر برای نمایش در کاتالوگ و فروشگاه. فرمت‌های JPG، PNG و GIF - حداکثر ۲ مگابایت',
    imagesFetchedFromDB: 'تصاویر از پایگاه داده دریافت و قابل ویرایش هستند (تصویر اصلی: {index})',
    clickCircleButton: 'روی دکمه دایره‌ای پایینِ سمت چپ هر تصویر کلیک کنید (تصویر انتخاب‌شده: {index})',
    uploadImage: 'در حال بارگذاری...',
    clickToSelectPDF: 'برای انتخاب PDF مربوط به {type} کلیک کنید',
    onlyPDF: 'فقط فایل‌های PDF',
    incompleteInfo: '⚠️ اطلاعات ناقص',
    enterNameCategoryFirst: 'لطفاً ابتدا نام و دسته‌بندی محصول را وارد کنید',
    standard13Barcode: 'بارکد استاندارد ۱۳ رقمی',
    manualInputPreventsAuto: 'ورود دستی مانع تولید خودکار می‌شود',
    barcode13Placeholder: 'بارکد ۱۳ رقمی',
    pricePerUnit: 'قیمت هر واحد به ارز انتخاب‌شده',
    stockManagement: 'مدیریت موجودی و وزن',
    stockRow: 'ردیف موجودی',
    stockNotEditable: 'موجودی فعلی محصول در انبار (مستقیماً قابل ویرایش نیست)',
    initialStockHelp: 'مقدار موجودی اولیه برای ثبت این محصول جدید',
    stockAdditionHelp: 'مقدار موجودی که می‌خواهید به انبار اضافه کنید (فقط هنگام ویرایش محصول موجود)',
    chemical: 'شیمیایی',
    allBatches: 'همه بچ‌ها',
    unit: 'واحد',
    units: 'واحدها',
    editable: 'قابل ویرایش',
    imagesUploadSection: 'بارگذاری تصویر',
    selectPrimaryImageTitle: 'انتخاب تصویر اصلی',
    imageFromMain: 'تصاویر محصول (از محصول اصلی)',
    maxThreeImages: 'حداکثر ۳ تصویر',
    catalogActionsButtons: 'دکمه‌های عملیات کاتالوگ',
    msdsSection: 'بخش MSDS',
    msdsActionsButtons: 'دکمه‌های عملیات MSDS',
    msdsSettings: 'تنظیمات MSDS',
    catalogSettings: 'تنظیمات کاتالوگ',
    showToCustomersLabel: 'نمایش به مشتریان',
    showToCustomersHelp: '{type} قابل دانلود در فروشگاه است',
    hidden: 'پنهان',
    forChemicalOnly: 'فقط برای محصولات شیمیایی',
    newBatchField: 'فیلد شماره بچ جدید',
    selectBatchForEdit: 'انتخاب بچ برای ویرایش',
    selectBatchPlaceholderText: 'بچ را انتخاب کنید...',
    allBatchesCount: 'همه بچ‌ها ({count}):',
    totalStockLabel: 'موجودی کل: {stock}',
    onlyWithStock: 'فقط بچ‌های دارای موجودی',
    batch: 'بچ',
    batchNum: 'بچ {number}',
    initialFixedValue: 'مقدار ثابت اولیه',
    fixedValue: 'مقدار ثابت',
    selectWeightUnit: 'واحد را انتخاب کنید',
    weightUnitKg: 'کیلوگرم (kg)',
    weightUnitG: 'گرم (g)',
    weightUnitLb: 'پوند (lb)',
    weightUnitOz: 'اونس (oz)',
    weightUnitT: 'تن (t)',
    tagsLabel: 'برچسب‌های محصول',
    tagsHelp: 'برچسب‌ها را با ویرگول جدا کنید. این برچسب‌ها در فروشگاه نمایش داده می‌شوند',
    tagsPlaceholder: 'نمونه: شیمیایی، صنعتی، شوینده',
    showWhenOutOfStockDesc: 'نمایش محصول حتی هنگام اتمام موجودی',
    clickToSelectCatalog: 'برای انتخاب PDF کاتالوگ کلیک کنید',
    clickToSelectMSDS: 'برای انتخاب PDF مربوط به MSDS کلیک کنید',
    catalogDownloadable: 'کاتالوگ در فروشگاه قابل دانلود است',
    msdsDownloadable: 'MSDS در فروشگاه قابل دانلود است',
    inStock: 'موجود',
    lowStock: 'موجودی کم',
    outOfStock: 'ناموجود',
    activeFilters: 'فیلترهای فعال:',
    statusLabel: 'وضعیت',
    visibilityLabel: 'قابل مشاهده بودن',
    hiddenProducts: 'محصولات پنهان',
    visibleProducts: 'محصولات قابل مشاهده',
    searchLabel: 'جستجو',
    clearAll: 'پاک کردن همه',
    totalProducts: 'تعداد کل محصولات',
    fileTooLarge: 'فایل بیش از حد بزرگ است',
    fileTooLargeDesc: 'حجم فایل باید کمتر از ۲ مگابایت باشد. لطفاً فایل را فشرده یا کوچک کنید.',
    invalidFormat: 'فرمت نامعتبر',
    invalidImageFormat: 'برای نمایش بهتر به مشتری، فقط تصاویر JPEG، PNG و WebP مجاز هستند.',
    invalidPDFFormat: 'برای اسناد، فقط فایل‌های PDF مجاز هستند.',
    uploadError: 'خطا در بارگذاری',
    uploadFailed: 'بارگذاری فایل ناموفق بود',
    success: 'موفق',
    imageUploadedSuccess: 'تصویر با موفقیت بارگذاری و برای نمایش به مشتری بهینه شد',
    technicalSpecifications: 'مشخصات فنی',
    technicalSpecificationsPlaceholder: 'مشخصات فنی را به‌صورت JSON یا متن وارد کنید...',
    technicalSpecificationsHelp: 'جزئیات فنی محصول که برای مشتریان در فروشگاه قابل مشاهده است',
    productFeatures: 'ویژگی‌های محصول',
    productFeaturesPlaceholder: 'ویژگی‌های محصول را وارد کنید (هر مورد در یک خط)',
    productFeaturesHelp: 'ویژگی‌های کلیدی قابل مشاهده برای مشتریان - هر مورد در یک خط',
    productApplications: 'کاربردهای محصول',
    productApplicationsPlaceholder: 'کاربردهای محصول را وارد کنید (هر مورد در یک خط)',
    productApplicationsHelp: 'کاربردها و موارد استفاده متداول - هر مورد در یک خط',
    batchInfoNotAvailable: 'اطلاعات بچ در دسترس نیست',
    displayMode: 'حالت نمایش محصول',
    displayModeHelp: 'نحوه مشاهده این محصول در فروشگاه را توسط مشتری انتخاب کنید',
    displayModeImages: 'گالری تصاویر (۳ عکس)',
    displayMode3D: 'مدل تعاملی سه‌بعدی',
    model3dFile: 'فایل مدل سه‌بعدی',
    uploadModel3d: 'بارگذاری مدل سه‌بعدی',
    viewModel3d: 'مشاهده مدل سه‌بعدی',
    deleteModel3d: 'حذف مدل سه‌بعدی',
    model3dHelp: 'برای نمایش تعاملی محصول، فایل GLB یا GLTF بارگذاری کنید (حداکثر ۱۰ مگابایت)',
    model3dFormats: 'فرمت‌های پشتیبانی‌شده: GLB، GLTF',
    model3dUploaded: 'مدل سه‌بعدی با موفقیت بارگذاری شد',
    model3dDeleted: 'مدل سه‌بعدی با موفقیت حذف شد',
    invalidModel3dFormat: 'برای مدل سه‌بعدی فقط فایل‌های GLB و GLTF مجاز هستند',
    model3dTooLarge: 'حجم فایل مدل سه‌بعدی باید کمتر از ۱۰ مگابایت باشد',
    rotate3dModel: 'برای چرخاندن بکشید',
    zoom3dModel: 'برای بزرگ‌نمایی پیمایش کنید',
    loading3dModel: 'در حال بارگذاری مدل سه‌بعدی...',
    error3dModel: 'خطا در بارگذاری مدل سه‌بعدی',
    pageTitle: 'مدیریت محصولات',
    pageSubtitle: 'مدیریت محصولات در پنج دسته',
    backToAdmin: 'بازگشت به مدیریت',
    logout: 'خروج',
    searchPlaceholder: 'جستجو بر اساس نام، بارکد یا SKU...',
    allProducts: 'همه محصولات',
    noProductsFound: 'محصولی پیدا نشد',
    noProductsAvailable: 'محصولی موجود نیست',
    noProductsMatch: 'محصولی مطابق «{query}» پیدا نشد. جستجو بر اساس نام، بارکد یا SKU را امتحان کنید.',
    addFirstProduct: 'برای شروع، اولین محصول خود را اضافه کنید.',
    clearSearch: 'پاک کردن جستجو',
    discontinued: 'متوقف‌شده',
    unknown: 'نامشخص',
    noBarcode: 'ثبت نشده',
    variant: 'گونه',
    companyLabel: 'شرکت',
    temperatureLabel: 'دمای حمل‌ونقل:',
    temperatureNone: 'بدون محدودیت دمایی',
    temperatureFrozen: 'منجمد: ‎۱۸- تا ۰ درجه سانتی‌گراد',
    temperatureChilled: 'سرد: ‎۲+ تا ۸+ درجه سانتی‌گراد',
    temperatureCool: 'خنک: ‎۸+ تا ۱۵+ درجه سانتی‌گراد',
    temperatureDry: 'دمای محیط (خشک): ۱۵ تا ۲۵ درجه سانتی‌گراد',
    assignVendor: 'اختصاص به فروشنده (اختیاری)',
    assignVendorHelp: 'در صورت تمایل، این محصول را به فروشنده بازار اختصاص دهید',
    selectVendor: 'انتخاب فروشنده (اختیاری)',
    noVendor: 'بدون فروشنده (محصول شرکت)',
    fileTooLargeTitle: 'فایل بیش از حد بزرگ است',
    imageTooLargeDesc: 'حجم تصویر باید کمتر از ۲ مگابایت باشد. لطفاً تصویر را فشرده یا کوچک کنید.',
    invalidImageFormatDesc: 'برای نمایش بهتر به مشتری، فقط تصاویر JPEG، PNG و WebP مجاز هستند.',
    imageUploadSuccess: 'تصویر با موفقیت بارگذاری و برای نمایش به مشتری بهینه شد',
    uploadErrorTitle: 'خطا در بارگذاری',
    imageUploadFailed: 'بارگذاری تصویر ناموفق بود',
    invalidImageFormatsDesc: 'فقط تصاویر JPEG، PNG، WEBP و GIF مجاز هستند.',
    removeImageError: 'حذف تصویر محصول ناموفق بود',
    imageFileTypes: 'JPG، PNG، WEBP، GIF',
    model3dFileTypes: 'فقط فایل‌های ‎.glb / .gltf',
    removeCatalogError: 'حذف فایل کاتالوگ ناموفق بود',
    removeMsdsError: 'حذف فایل MSDS ناموفق بود',
    catalogFilename: 'catalog.pdf',
    msdsFilename: 'msds.pdf',
    selected: 'انتخاب‌شده',
    model3dPreview: 'پیش‌نمایش مدل سه‌بعدی',
    aiGenerate: 'هوش مصنوعی',
  },
  login: 'ورود',
  logout: 'خروج',
  register: 'ثبت‌نام',
  search: 'جستجو',
  loading: 'در حال بارگذاری...',
  error: 'خطا',
  save: 'ذخیره',
  cancel: 'لغو',
  close: 'بستن',
  submit: 'ثبت',
  continueShopping: 'ادامه خرید',
  myAccount: 'حساب من',
  accountInformation: 'اطلاعات حساب',
  manageAccount: 'مدیریت حساب و مشاهده تاریخچه سفارش‌ها',
  editProfile: 'ویرایش پروفایل',
  firstName: 'نام',
  lastName: 'نام خانوادگی',
  phone: 'تلفن',
  address: 'آدرس',
  city: 'شهر',
  country: 'کشور',
  province: 'استان',
  welcome: 'خوش آمدید',
  advancedChemical: 'راهکارهای پیشرفته',
  solutions: 'شیمیایی',
  forIndustry: 'برای صنعت',
  heroDescription: 'ارائه‌دهنده راهکارهای شیمیایی باکیفیت برای صنایع مختلف؛ از افزودنی‌های سوخت تا تصفیه آب و کاربردهای کشاورزی.',
  contactSales: 'تماس با واحد فروش',
  ourProductPortfolio: 'سبد محصولات ما',
  productPortfolioDesc: 'مجموعه‌ای جامع از راهکارهای شیمیایی تخصصی، طراحی‌شده برای عملکرد مطمئن در صنایع مختلف.',
  products_plural: 'محصول',
  availableProducts: 'محصولات موجود:',
  moreProducts: 'محصول دیگر',
  viewAll: 'مشاهده همه',
  aboutMomtazchem: 'درباره ممتازکم',
  aboutMomtazchemDesc1: 'ممتازکم با بیش از ۲۵ سال تجربه در تولید مواد شیمیایی، به شریکی قابل اعتماد برای صنایع مختلف تبدیل شده است. نوآوری، کیفیت و پایداری پایه تمام فعالیت‌های ما هستند.',
  aboutMomtazchemDesc2: 'در مجموعه‌های پیشرفته خود، راهکارهای شیمیایی باکیفیتی برای نیازهای رو‌به‌رشد صنایع سوخت، تصفیه آب، رنگ و کشاورزی توسعه و تولید می‌کنیم.',
  learnMoreAboutUs: 'بیشتر درباره ما',
  customerSatisfaction: 'رضایت مشتریان',
  ourServicesCapabilities: 'خدمات و توانمندی‌های ما',
  servicesCapabilitiesDesc: 'پشتیبانی جامع از تحقیق و توسعه تا تحویل محصول و خدمات فنی.',
  rdServices: 'تحقیق و توسعه',
  rdServicesDesc: 'توسعه فرمولاسیون‌های اختصاصی و بهینه‌سازی محصولات متناسب با نیازهای هر صنعت.',
  customFormulations: 'فرمولاسیون اختصاصی',
  productTesting: 'آزمایش محصول',
  performanceAnalysis: 'تحلیل عملکرد',
  globalDistribution: 'توزیع جهانی',
  globalDistributionDesc: 'شبکه قابل اعتماد تأمین و لجستیک برای تحویل به‌موقع محصولات در بازارهای مختلف.',
  countries40Plus: 'بیش از ۴۰ کشور',
  expressShipping: 'ارسال سریع',
  bulkOrders: 'سفارش‌های عمده',
  technicalSupport: 'پشتیبانی فنی',
  technicalSupportDesc: 'مشاوره و پشتیبانی تخصصی برای استفاده صحیح و دستیابی به بهترین عملکرد محصول.',
  support24_7: 'پشتیبانی شبانه‌روزی',
  applicationTraining: 'آموزش کاربرد محصول',
  documentation: 'مستندات فنی',
  qualityExcellence: 'برتری در کیفیت',
  qualityExcellenceDesc: 'با رعایت استانداردهای معتبر و گواهینامه‌های ISO، کیفیت پایدار محصولات و فرایندهای خود را تضمین می‌کنیم.',
  environmentalResponsibility: 'مسئولیت‌پذیری زیست‌محیطی',
  environmentalResponsibilityDesc: 'به تولید پایدار و توسعه راهکارهای شیمیایی سازگارتر با محیط زیست متعهد هستیم.',
  aboutTitle: 'درباره ممتازکم',
  aboutSubtitle: 'بیش از ۲۵ سال پیشرو در صنعت شیمی با تکیه بر نوآوری، کیفیت و پایداری.',
  ourStory: 'داستان ما',
  ourMission: 'ماموریت ما',
  ourVision: 'چشم‌انداز ما',
  ourCoreValues: 'ارزش‌های بنیادین ما',
  valuesSubtitle: 'اصولی که هر روز راهنمای تصمیم‌های ما هستند و فرهنگ سازمانی‌مان را شکل می‌دهند.',
  ourTeamExpertise: 'تیم و تخصص ما',
  certificationsCompliance: 'گواهینامه‌ها و انطباق با استانداردها',
  certificationsSubtitle: 'برای تضمین کیفیت، ایمنی و مسئولیت‌پذیری زیست‌محیطی، بالاترین استانداردها و گواهینامه‌های صنعت را رعایت می‌کنیم.',
  storyParagraph1: 'ممتازکم در سال ۱۹۹۹ با هدف ارائه راهکارهای شیمیایی باکیفیت به صنایع مختلف فعالیت خود را آغاز کرد. طی بیش از ۲۵ سال، به تولیدکننده‌ای پیشرو تبدیل شده‌ایم که نیازهای چهار بخش اصلی بازار را تأمین می‌کند.',
  storyParagraph2: 'مسیر رشد ما با نوآوری مستمر، توسعه هدفمند و تعهد همیشگی به کیفیت همراه بوده است. امروز با بهره‌گیری از مجموعه‌های تولیدی پیشرفته، به مشتریان بیش از ۴۰ کشور جهان خدمت‌رسانی می‌کنیم.',
  storyParagraph3: 'در مسیر آینده نیز به پیشرفت دانش شیمی، موفقیت مشتریان و ساختن جهانی پایدارتر متعهد می‌مانیم.',
  missionText: 'توسعه و تولید راهکارهای شیمیایی نوآورانه برای بهبود فرایندهای صنعتی، افزایش عملکرد محصولات و کمک به توسعه پایدار، همراه با رعایت بالاترین استانداردهای کیفیت و ایمنی.',
  visionText: 'تبدیل‌شدن به قابل‌اعتمادترین شریک جهانی در زمینه راهکارهای شیمیایی؛ شناخته‌شده به‌خاطر نوآوری، پایداری و تعهد به پیشرفت صنایع و حفاظت از محیط زیست برای نسل‌های آینده.',
  teamText: 'موفقیت ما بر تخصص و تعهد اعضای تیم استوار است. بیش از ۵۰۰ متخصص، شامل مهندسان شیمی، پژوهشگران، کارشناسان کیفیت و متخصصان صنایع مختلف، در کنار ما فعالیت می‌کنند.',
  customerFocus: 'تمرکز بر مشتری',
  customerFocusDesc: 'موفقیت مشتریان اولویت ماست؛ ازاین‌رو راهکارهای متناسب و خدماتی ممتاز ارائه می‌کنیم.',
  globalReach: 'حضور جهانی',
  globalReachDesc: 'با زنجیره تأمین مطمئن و پشتیبانی محلی، به مشتریان بیش از ۴۰ کشور خدمت‌رسانی می‌کنیم.',
  employees: 'کارمند',
  rdScientists: 'پژوهشگر تحقیق و توسعه',
  manufacturingSites: 'مرکز تولیدی',
  qualityRate: 'نرخ کیفیت',
  iso9001Desc: 'سیستم مدیریت کیفیت',
  iso14001Desc: 'مدیریت زیست‌محیطی',
  ohsas18001Desc: 'ایمنی و بهداشت حرفه‌ای',
  reachCompliance: 'انطباق با REACH',
  reachComplianceDesc: 'مقررات مواد شیمیایی اتحادیه اروپا',
  servicesPage: {
    ...baseTranslations.en.servicesPage,
    title: 'خدمات و توانمندی‌های ما',
    subtitle: 'پشتیبانی جامع از تحقیق و توسعه تا تحویل محصول و خدمات فنی؛ در تمام مراحل همراه موفقیت شما هستیم.',
    rdTitle: 'تحقیق و توسعه',
    rdDesc: 'توسعه فرمولاسیون‌های اختصاصی و بهینه‌سازی محصول متناسب با نیازهای ویژه شما.',
    rdFeature1: 'فرمولاسیون اختصاصی مواد شیمیایی',
    rdFeature2: 'آزمون عملکرد محصول',
    rdFeature3: 'پشتیبانی انطباق با مقررات',
    rdFeature4: 'توسعه از مقیاس آزمایشگاهی تا تولید',
    rdFeature5: 'بهینه‌سازی کیفیت',
    rdFeature6: 'توسعه کاربرد محصول',
    distributionTitle: 'توزیع جهانی',
    distributionDesc: 'زنجیره تأمین و شبکه لجستیک مطمئن برای تحویل به‌موقع محصولات در سراسر جهان.',
    distFeature1: 'پوشش بیش از ۴۰ کشور',
    distFeature2: 'گزینه‌های ارسال سریع',
    distFeature3: 'مدیریت سفارش‌های عمده',
    distFeature4: 'مدیریت زنجیره سرد',
    distFeature5: 'رهگیری لحظه‌ای',
    distFeature6: 'انبارداری محلی',
    techSupportTitle: 'پشتیبانی فنی',
    techSupportDesc: 'مشاوره و پشتیبانی تخصصی برای استفاده صحیح و بهینه از محصولات.',
    techFeature1: 'پشتیبانی فنی شبانه‌روزی',
    techFeature2: 'آموزش کاربرد محصول',
    techFeature3: 'پشتیبانی عیب‌یابی',
    techFeature4: 'بهینه‌سازی عملکرد',
    techFeature5: 'راهنمای ایمنی',
    techFeature6: 'پشتیبانی مستندات فنی',
    consultingTitle: 'خدمات مشاوره',
    consultingDesc: 'مشاوره راهبردی برای بهینه‌سازی فرایندها و عملیات شیمیایی مجموعه شما.',
    consultFeature1: 'بهینه‌سازی فرایند',
    consultFeature2: 'تحلیل کاهش هزینه',
    consultFeature3: 'ارزیابی پایداری',
    consultFeature4: 'راهنمای مقررات',
    consultFeature5: 'تحلیل بازار',
    consultFeature6: 'برنامه‌ریزی راهبردی',
    qaTitle: 'تضمین کیفیت',
    qaDesc: 'برنامه‌های جامع کنترل و تضمین کیفیت برای تمام محصولات.',
    qaFeature1: 'فرایندهای دارای گواهینامه ISO',
    qaFeature2: 'آزمون و تحلیل هر بچ تولیدی',
    qaFeature3: 'گواهی آنالیز محصول',
    qaFeature4: 'مستندات کیفیت',
    qaFeature5: 'انطباق با مقررات',
    qaFeature6: 'پایش مستمر',
    customMfgTitle: 'تولید سفارشی',
    customMfgDesc: 'راهکارهای تولید متناسب با نیازهای تخصصی مواد شیمیایی.',
    customFeature1: 'تولید قراردادی',
    customFeature2: 'تولید با برند اختصاصی',
    customFeature3: 'حجم تولید انعطاف‌پذیر',
    customFeature4: 'فرمولاسیون‌های تخصصی',
    customFeature5: 'راهکارهای بسته‌بندی',
    customFeature6: 'یکپارچه‌سازی زنجیره تأمین',
    coreCapabilities: 'توانمندی‌های اصلی ما',
    coreCapabilitiesDesc: 'پشتوانه‌ای از چند دهه تجربه و فناوری‌های پیشرفته',
    advManufacturing: 'تولید پیشرفته',
    advManufacturingDesc: 'مجموعه‌های مدرن مجهز به تجهیزات و سامانه‌های خودکار',
    qualityControl: 'کنترل کیفیت',
    qualityControlDesc: 'آزمون‌های دقیق و تضمین کیفیت در تمام مراحل',
    globalReachCap: 'حضور جهانی',
    globalReachCapDesc: 'خدمت‌رسانی به مشتریان بیش از ۴۰ کشور جهان',
    expertTeam: 'تیم متخصص',
    expertTeamDesc: 'بیش از ۵۰ پژوهشگر و متخصص مهندسی شیمی',
    serviceProcess: 'فرایند ارائه خدمات',
    serviceProcessDesc: 'از مشاوره اولیه تا پشتیبانی مستمر، در تمام مراحل همراه شما هستیم.',
    consultation: 'مشاوره',
    consultationDesc: 'شناخت دقیق نیازها و چالش‌های شما',
    development: 'توسعه',
    developmentDesc: 'توسعه فرمولاسیون و راهکار اختصاصی',
    testing: 'آزمایش',
    testingDesc: 'آزمون دقیق و اعتبارسنجی کیفیت',
    delivery: 'تحویل',
    deliveryDesc: 'تولید، تحویل و پشتیبانی مستمر',
    readyToStart: 'آماده شروع همکاری هستید؟',
    contactExpertsDesc: 'برای بررسی نیازهای شیمیایی مجموعه خود و آشنایی با راهکارهای ما، با تیم متخصصان ممتازکم تماس بگیرید.',
    contactSales: 'تماس با واحد فروش',
    requestQuote: 'درخواست قیمت',
    contactSalesTitle: 'تماس با واحد فروش',
    fullName: 'نام و نام خانوادگی',
    emailAddress: 'نشانی ایمیل',
    companyName: 'شرکت',
    phoneNumber: 'شماره تلفن',
    message: 'پیام',
    messagePlaceholder: 'نیازها و درخواست خود را برای ما بنویسید...',
    cancel: 'لغو',
    sendMessage: 'ارسال پیام',
    sending: 'در حال ارسال...',
    requestQuoteTitle: 'درخواست قیمت',
    productCategory: 'دسته‌بندی محصول',
    productCategoryPlaceholder: 'برای نمونه: کود کشاورزی یا مواد تصفیه آب',
    requiredQuantity: 'مقدار موردنیاز',
    quantityPlaceholder: 'برای نمونه: ۵۰۰ کیلوگرم یا ۱۰ تن',
    requiredTimeline: 'زمان موردنیاز',
    timelinePlaceholder: 'برای نمونه: طی دو هفته آینده',
    productSpecs: 'مشخصات محصول',
    specsPlaceholder: 'مشخصات فنی، درصد خلوص، نوع بسته‌بندی و سایر نیازهای خود را بنویسید.',
    additionalReqs: 'نیازهای تکمیلی',
    additionalPlaceholder: 'اطلاعات بیشتر یا نیازهای ویژه...',
    submitQuote: 'ثبت درخواست قیمت',
    submitting: 'در حال ثبت...',
    messageSent: 'پیام با موفقیت ارسال شد',
    messageSentDesc: 'واحد فروش حداکثر طی ۲۴ ساعت با شما تماس خواهد گرفت.',
    quoteSubmitted: 'درخواست قیمت ثبت شد',
    quoteSubmittedDesc: 'تیم ما قیمت پیشنهادی را آماده می‌کند و حداکثر طی ۲۴ ساعت پاسخ می‌دهد.',
    errorTitle: 'خطا',
    messageFailed: 'ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید.',
    quoteFailed: 'ثبت درخواست قیمت انجام نشد. لطفاً دوباره تلاش کنید.',
  },
  blog: {
    ...baseTranslations.en.blog,
    title: 'بلاگ ممتازکم',
    subtitle: 'جدیدترین مقاله‌ها، راهنماها و دیدگاه‌های تخصصی درباره صنایع شیمیایی، افزودنی‌های سوخت، تصفیه آب و مواد شیمیایی صنعتی',
    searchPlaceholder: 'جستجو در عنوان یا محتوای مقاله‌ها...',
    allTags: 'همه برچسب‌ها',
    readMore: 'ادامه مطلب',
    by: 'نوشته',
    views: 'بازدید',
    noPostsFound: 'مقاله‌ای پیدا نشد',
    noPostsMessage: 'مقاله‌ای مطابق جستجو یا فیلتر انتخاب‌شده وجود ندارد. عبارت جستجو یا فیلترها را تغییر دهید.',
    loadingPosts: 'در حال بارگذاری مقاله‌ها...',
    previousPage: 'صفحه قبل',
    nextPage: 'صفحه بعد',
    page: 'صفحه',
    of: 'از',
  },
  blogPost: {
    ...baseTranslations.en.blogPost,
    loading: 'در حال بارگذاری مقاله...',
    notFound: 'مقاله پیدا نشد',
    notFoundMessage: 'مقاله موردنظر وجود ندارد یا حذف شده است.',
    backToBlog: 'بازگشت به بلاگ',
    shareArticle: 'اشتراک‌گذاری مقاله',
    copyLink: 'کپی لینک',
    linkCopied: 'لینک کپی شد!',
    linkCopiedMessage: 'لینک مقاله در حافظه موقت کپی شد.',
    tableOfContents: 'فهرست مطالب',
    aboutAuthor: 'درباره نویسنده',
    relatedPosts: 'مقاله‌های مرتبط',
    noRelatedPosts: 'مقاله مرتبطی وجود ندارد.',
    readingTime: 'زمان مطالعه',
    minutes: 'دقیقه مطالعه',
    publishedOn: 'تاریخ انتشار',
    updatedOn: 'تاریخ به‌روزرسانی',
    previousPost: 'مقاله قبلی',
    nextPost: 'مقاله بعدی',
    tags: 'برچسب‌ها',
    share: 'اشتراک‌گذاری',
  },
  contactPage: {
    ...baseTranslations.en.contactPage,
    firstName: 'نام',
    lastName: 'نام خانوادگی',
    emailAddress: 'نشانی ایمیل',
    company: 'شرکت',
    productInterest: 'محصول موردنظر',
    message: 'پیام',
    firstNamePlaceholder: 'نام شما',
    lastNamePlaceholder: 'نام خانوادگی شما',
    emailPlaceholder: 'example@company.com',
    companyPlaceholder: 'نام شرکت شما',
    productInterestPlaceholder: 'یک دسته محصول انتخاب کنید',
    messagePlaceholder: 'نیازها و درخواست خود را برای ما بنویسید...',
    waterTreatment: 'تصفیه آب',
    fuelAdditives: 'افزودنی‌های سوخت',
    paintThinner: 'رنگ و تینر',
    agriculturalFertilizers: 'کودهای کشاورزی',
    industrialChemicals: 'مواد شیمیایی صنعتی',
    technicalEquipment: 'تجهیزات فنی',
    commercialGoods: 'کالاهای تجاری',
    customSolutions: 'راهکارهای سفارشی',
    sending: 'در حال ارسال...',
    sendMessage: 'ارسال پیام',
    messageSent: 'پیام با موفقیت ارسال شد',
    messageSentDesc: 'از تماس شما سپاسگزاریم. حداکثر تا ۲۴ ساعت آینده پاسخ خواهیم داد.',
    errorTitle: 'خطا',
    errorDesc: 'ارسال پیام انجام نشد. لطفاً دوباره تلاش کنید.',
    contactInformation: 'اطلاعات تماس',
    ourCertifications: 'گواهینامه‌های ما',
    findUs: 'موقعیت ما',
    visitHeadquarters: 'از دفتر مرکزی و مجموعه تولیدی ما بازدید کنید',
    getDirections: 'مسیریابی',
    viewInMaps: 'مشاهده در Google Maps',
  },
  shop: {
    ...baseTranslations.en.shop,
    title: 'فروشگاه',
    lowStockWarning: 'فقط {count} عدد باقی مانده است!',
    priceFilter: 'فیلتر قیمت',
    minPrice: 'حداقل',
    maxPrice: 'حداکثر',
    inStock: 'موجود',
    outOfStock: 'ناموجود',
    volumeDeals: 'تخفیف خرید عمده',
    active: 'فعال',
    off: 'تخفیف',
    more: 'عدد دیگر',
    items: 'عدد',
    max: 'بیشترین',
    addToCart: 'افزودن به سبد خرید',
    addMore: 'افزودن بیشتر',
    notAvailable: 'ناموجود',
    insufficientStock: 'موجودی کافی نیست',
    maxStockInCart: 'تمام موجودی این کالا در سبد خرید شماست',
    onlyXAvailable: 'فقط {count} عدد از این کالا موجود است',
    onlyXLeft: 'فقط {count} عدد باقی مانده است!',
    productReviews: 'نظرها و امتیاز کالا',
    technicalSpecs: 'مشخصات فنی',
    hideWalletBalance: 'پنهان‌کردن موجودی کیف پول',
    showWalletBalance: 'نمایش موجودی کیف پول',
    addedToCart: 'به سبد خرید اضافه شد',
    addedToCartDesc: '{count} عدد از {product} به سبد خرید اضافه شد',
    welcome: 'خوش آمدید',
    registrationSuccessful: 'ثبت‌نام موفق',
    welcomeMessage: '{name} خوش آمدید',
    logoutSuccessful: 'خروج موفق',
    logoutMessage: 'با موفقیت از حساب خود خارج شدید',
    error: 'خطا',
    logoutError: 'خطا هنگام خروج از حساب',
    loginSuccessful: 'ورود موفق',
    loginWelcome: 'خوش آمدید! اکنون می‌توانید خرید خود را تکمیل کنید',
    unit: 'عدد',
    units: 'عدد',
    buy: 'خرید',
    search: 'جستجوی محصولات',
    filters: 'فیلترها',
    searchProducts: 'جستجوی کالاها',
    searchProductsPlaceholder: 'جستجوی کالاها...',
    sortBy: 'مرتب‌سازی بر اساس',
    relevance: 'مرتبط‌ترین',
    name: 'نام',
    categories: 'دسته‌بندی‌ها',
    priceRange: 'محدوده قیمت',
    clearAllFilters: 'پاک‌کردن همه فیلترها',
    clearFilters: 'پاک‌کردن فیلترها',
    ascending: 'صعودی',
    descending: 'نزولی',
    highToLow: 'بیشترین به کمترین',
    lowToHigh: 'کمترین به بیشترین',
    aToZ: 'الف تا ی',
    zToA: 'ی تا الف',
    availability: 'وضعیت موجودی',
    inStockOnly: 'فقط کالاهای موجود',
    newest: 'جدیدترین',
    showingProducts: 'نمایش',
    page: 'صفحه',
    of: 'از',
    product: 'کالا',
    products: 'کالا',
  },
  cart: 'سبد خرید',
  checkout: 'تسویه حساب',
  total: 'مجموع',
  subtotal: 'جمع جزء',
  shipping: 'ارسال',
  orderSummary: 'خلاصه سفارش',
  placeOrder: 'ثبت سفارش',
  },
} as Record<Language, Translation>;

export const getDirection = (language: Language): 'ltr' | 'rtl' => {
  return language === 'en' || language === 'tr' ? 'ltr' : 'rtl';
};

export const getLanguageName = (language: Language): string => {
  const names = {
    en: 'English',
    ar: 'العربية',
    tr: 'Türkçe',
    fa: 'فارسی',
  };
  return names[language];
};