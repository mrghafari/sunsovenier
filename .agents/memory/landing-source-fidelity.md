---
name: Landing source fidelity
description: User's preservation requirement for the supplied landing-page design.
---

Preserve the uploaded landing page's graphics and content rather than redesigning or removing them to reduce size. The user said: «چیزی از دست نره همین گرافیک ها باشه و اپتیمایز کن که سبک بشه بدون افت کیفیت».

Keep the homepage hero background photo clearly visible, not obscured by dense dark overlays.

**Why:** The user explicitly requested the supplied design and no quality loss, and later reported that the hero photo was too dark and barely visible.

**How to apply:** Prefer externalized, cached media, deferred loading, and pixel-verified lossless optimization. Do not replace the supplied artwork or use lossy recompression without asking.

The corrected blue/navy landing reference replaces the earlier gold design. The user also said: «تمهای دیگر صفحات هم از این پیروی کند».

**Why:** The user explicitly requested the replacement homepage and consistent themes on other pages.

**How to apply:** Carry the supplied visual identity through shared page themes and components, while retaining functional forms, permissions, and meaningful success/warning/error colors.

The user approved a full landing redesign using the later SaaS-style text brief, with existing content, but explicitly rejected changing the current color theme: «تم رنگها را عوض نکن همن که هست خوبه».

**Why:** The user selected «طراحی کامل با محتوای فعلی», then corrected the brief's orange/black palette.

**How to apply:** Improve composition, cards, typography and lighting while retaining blue/navy, the light/dark section rhythm, real content and CMS controls. Do not introduce the brief's orange theme or fabricated SaaS data/prices.

The homepage About visual should show one continuous photo behind four window panes, at the same overall size as the replaced visual.

**Why:** The user clarified that one supplied image must be split into four quarters, as if behind a window, superseding the earlier request for four independently editable photos. They later requested removal of the speaker icon; the transparent background, slight depth and hover ticks remain requested.

**How to apply:** Use one CMS-managed About image, cropped continuously across two-by-two panes on mobile and desktop. Keep crops spatially aligned in RTL and any motion synchronized. Retain transparent gaps, modest depth and hover ticks, without a visible speaker control.

Manage landing images and the supplied settings controls in the existing content-management module, not an inline browser-only editor on the homepage.

**Why:** The user explicitly corrected the location: «باید بیاد در ماژول محتوی».

**How to apply:** Keep editing in the authorized content module; saved changes must be shared site content rather than a private browser preview.

The user requires complete dashboard control of the homepage: «تمامی بخش‌ها، فرم‌ها، بنرها و محتوای صفحه اصلی باید به طور کامل به پنل مدیریت متصل شوند».

**Why:** The user explicitly requires the whole homepage to be manageable, not just its images or FAQ.

**How to apply:** When adding homepage content or forms, include authorized editing and public rendering together. Submitted forms must reach a real administrative inbox; browser-only previews do not satisfy this requirement.

Use “Get A Quote” as the estimate form entry point, without a separate “Get A Free Estimate” bar.

**Why:** The user explicitly said the duplicate control was unnecessary because both perform the same function.

**How to apply:** Keep one shared estimate form, hidden until requested; preserve its transparent appearance and existing product-specific request links.

Opening the estimate form must move only the document, never create an internal scroll position inside the clipped hero.

**Why:** The user reported an apparent freeze on iPhone 15 Pro Max. The same symptom was reproduced when the document returned to the top but the hero retained its own scroll offset, hiding its upper content.

**How to apply:** Preserve a non-scrollable hero clip and explicit document scrolling, aligning the form below the header. Verify real touch swipes back to the top, repeated opening, direct quote links and smaller mobile viewports.

The homepage must allow modular, block-based drag-and-drop editing: the administrator should be able to create new arrangements without code changes.

**Why:** The user explicitly requested dynamic placement of homepage blocks and elements.

**How to apply:** Preserve the supplied design as the default, not a restriction against administrator-authored layouts. Keep layout editing in Content Management and publish it through the same authorized shared save as homepage content.

Each hero slide needs its own localized eyebrow, heading and description, independently hideable without hiding its product/quote buttons or erasing its text.

**Why:** The user explicitly identified “Momtaz Chem Industrial”, “Industrial Chemical Solutions & High-Grade Solvents” and its description, then requested text matching each slide's own photo with independent visibility.

**How to apply:** Keep the image, localized caption fields, language selector and visibility control together on each slide card, synchronized with detailed settings. Empty fields retain the general site-text fallback; explain this in the editor. Treat older slides without a visibility preference as visible, and preserve banner geometry when text is hidden.

Slide captions should fade in and fade out when slides change.

**Why:** The user explicitly requested «تکستی که قرار است روی اسلاید نشان داده شود فید این فید اوت شود».

**How to apply:** Fade the outgoing words before replacing them, then reveal the incoming caption for both automatic and manual slide selection. Keep CTA controls outside this transition, retain per-slide visibility, cancel stale transitions after rapid selections, and respect reduced-motion preferences.

Keep the product/quote buttons and slide indicators at the bottom edge of the hero image, independently of the slide text.

**Why:** The user marked those controls in a screenshot and requested «این آیتم ها را بیار لبه پایین تصویر».

**How to apply:** Anchor the group to the hero's lower area, not the viewport. Preserve RTL alignment and keep the expanded estimate form clear of the controls without internal hero scrolling.

The supplied dark/orange landing video is a motion reference only, not a replacement for Momtazchem's content or visual identity.

**Why:** The user said «منظورم حالت انیمیشن است نه محتوایی» and approved applying that animation style while preserving the existing landing page.

**How to apply:** Adapt staged entrances, scroll reveals, restrained depth and light effects to the existing blue/navy content. Do not copy the video's orange palette, dashboard imagery or text.

Verify motion by meaningful positional change during actual scrolling, including reverse scrolling, rather than merely detecting an active CSS animation.

**Why:** The user reported the animation had not been done even though the new code loaded; the initial implementation moved foreground layers only a few pixels and its short entrance finished before they noticed it.

**How to apply:** Check visible foreground/background displacement separately, section entry and re-entry, and reduced-motion behavior. A passing animation-presence check alone does not establish fidelity to the supplied video.

Packaging-section photos and cards should gradually brighten from dark to normal as scrolling brings them into view.

**Why:** The user requested a graphical dark-to-normal appearance for «Full-Scale Chemical Packaging» during scrolling.

**How to apply:** Preserve the progressive reveal rather than showing every card at full brightness immediately; keep the normal final colors and respect reduced-motion preferences.

Text should gradually change from faded to its full original color as the user scrolls down.

**Why:** The user explicitly requested «اسکرول به سمت پایین که میکنیم تکستها از حالت محو به سمت رنگ کامل برود».

**How to apply:** Progress opacity with section entry rather than changing text colors; retain the slower mobile reveal pacing and immediately show full text for reduced-motion users.

Mobile card and text appearances should take three times the original duration; this request does not refer to changing the banner image.

**Why:** The user requested «این زمان را سه برابر کن» and clarified that they meant «ظاهرشدن کارت‌ها و متن‌ها».

**How to apply:** Preserve the slower mobile reveal pacing and start it when content enters view, rather than consuming its fade time below the viewport. Keep slideshow timing separate.

Use the company's real logo beside the brand name, not the reference's flask icon.

**Why:** The user explicitly said: «از لوگوی شرکت کنار اسم برند استفاده کن».

**How to apply:** Follow the existing configured company-logo source and retain its bundled fallback when external images fail.

The landing header telephone belongs in Company Information → Contact Information → Phone & WhatsApp, rather than the homepage content editor.

**Why:** The user explicitly requested editing the top-of-landing phone from the company's contact information.

**How to apply:** Keep this contact setting independent of the company's primary and secondary phones; update both its displayed number and click-to-call link together.

The storefront must offer an icon-only day/night button; night mode should use the original dark theme. The discount banner should use the site's blue palette, not red.

**Why:** The user requested «دکمه روز و شب» with «در حالت شب همان تم اصلی که تیره است», then clarified «نیاز به نوشته هم نیست فقط نشانه اش باشه کافیه» and asked for a blue discount banner.

**How to apply:** Reuse the existing navy dark palette rather than introduce an unrelated night theme. Keep the control icon-only with an accessible name and tooltip.

Homepage category links must open the shop. Category Management is the sole editor for category names and decorative sample photos; Site Content links to that module instead of maintaining a second editor.

**Why:** After initially requesting editing through Site Content, the user clarified that categories are introduced in the category management module and the same categories and their sample photos must appear on the homepage.

**How to apply:** Use managed category records as the public source, preserve the existing photo-card appearance and group samples beneath their owning category. Do not maintain an independent hardcoded category list or resurrect old public product pages.

The user originally supplied seven example headings for decorative photo cards, but later made the actual managed categories authoritative.

**Why:** The latest instruction explicitly connects the homepage and its sample pictures to Category Management, replacing the previously separate illustration headings.

**How to apply:** Preserve existing photos when transferring ownership; do not force seven cards or substitute container sizes for the names entered in Category Management.

Category Management starts with a thumbnail preview of each category's decorative photo. New category photo uploads must stay in the existing configured Amazon S3 bucket.

**Why:** The user requested thumbnails at the beginning of Category Management and explicitly said the photo storage must remain the same Amazon bucket.

**How to apply:** Keep storage in S3, not local disk or another provider. A storage error must fail visibly rather than silently saving elsewhere.

Each category needs only one decorative photo in its editing form, not a multi-photo gallery or a second cover-image field.

**Why:** The user explicitly said two photos appear when editing a category and one decorative photo is sufficient.

**How to apply:** Show the first legacy photo initially, replace rather than append when uploading or entering a URL, and synchronize the cover when saving. The homepage also shows only that first photo, even for unsaved legacy galleries, in the same category display order as the navigation. Opening the form or rendering the homepage must not change saved data or delete S3 files.

The landing header's Customer account entry is replaced by Logistics. The homepage Logistics card is removed, and its photo belongs behind the new localized under-construction page.

**Why:** The user requested this move and said Logistics content would be built later.

**How to apply:** Preserve the existing logistics image and its CMS override. Keep the placeholder in the selected site language; do not invent Logistics content or remove customer-account access elsewhere.

The public `/products` catalog and all category subpages are retired; customers use the shop instead.

**Why:** The user explicitly requested removing the old Products route and its subpages, naming `/products/agricultural-fertilizers` as an example.

**How to apply:** Do not restore the old header category dropdown or sitemap entries. Send old public catalog URLs and saved navigation links to `/shop`; preserve Kardex, vendor management, product APIs and stored product data.

Every landing category card needs a localized Purchase button on the physical right, opposite View Details; its details popup needs the same button at the bottom right.

**Why:** The user explicitly requested both placements and language-sensitive text.

**How to apply:** Keep the right-hand placement in RTL as well as LTR. Purchase opens the shop; retain the independent details and quote actions.

Purchase controls use an icon-only shopping cart instead of visible Purchase text.

**Why:** After asking to remove the white square and animate the text, the user chose a shopping-cart icon instead of the text.

**How to apply:** Use an SVG icon rather than a font glyph to avoid missing-icon squares. Keep a localized accessible name and tooltip; the button remains a link to the shop. The user requested no background or surrounding circle, including on hover; retain a usable invisible touch target and keyboard-focus indicator.

The details action under category sample photos opens a carousel of actual products belonging to that category. Each slide uses the product's first image, with technical specifications and packing in separate, visibly different panels on the physical right.

**Why:** The user requested previous/next product navigation inside the same category, synchronized with that product's technical and packaging details, while retaining the other existing popup information.

**How to apply:** Do not cycle through the category's decorative images or mix in another category's products. Keep category/sample information and quote/shop actions. On narrow screens stack the image above the details without horizontal overflow.
