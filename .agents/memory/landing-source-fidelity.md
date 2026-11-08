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

Manage landing images and the supplied settings controls in the existing content-management module, not an inline browser-only editor on the homepage.

**Why:** The user explicitly corrected the location: «باید بیاد در ماژول محتوی».

**How to apply:** Keep editing in the authorized content module; saved changes must be shared site content rather than a private browser preview.

The user requires complete dashboard control of the homepage: «تمامی بخش‌ها، فرم‌ها، بنرها و محتوای صفحه اصلی باید به طور کامل به پنل مدیریت متصل شوند».

**Why:** The user explicitly requires the whole homepage to be manageable, not just its images or FAQ.

**How to apply:** When adding homepage content or forms, include authorized editing and public rendering together. Submitted forms must reach a real administrative inbox; browser-only previews do not satisfy this requirement.

The homepage must allow modular, block-based drag-and-drop editing: the administrator should be able to create new arrangements without code changes.

**Why:** The user explicitly requested dynamic placement of homepage blocks and elements.

**How to apply:** Preserve the supplied design as the default, not a restriction against administrator-authored layouts. Keep layout editing in Content Management and publish it through the same authorized shared save as homepage content.

The supplied dark/orange landing video is a motion reference only, not a replacement for Momtazchem's content or visual identity.

**Why:** The user said «منظورم حالت انیمیشن است نه محتوایی» and approved applying that animation style while preserving the existing landing page.

**How to apply:** Adapt staged entrances, scroll reveals, restrained depth and light effects to the existing blue/navy content. Do not copy the video's orange palette, dashboard imagery or text.

Verify motion by meaningful positional change during actual scrolling, including reverse scrolling, rather than merely detecting an active CSS animation.

**Why:** The user reported the animation had not been done even though the new code loaded; the initial implementation moved foreground layers only a few pixels and its short entrance finished before they noticed it.

**How to apply:** Check visible foreground/background displacement separately, section entry and re-entry, and reduced-motion behavior. A passing animation-presence check alone does not establish fidelity to the supplied video.

Packaging-section photos and cards should gradually brighten from dark to normal as scrolling brings them into view.

**Why:** The user requested a graphical dark-to-normal appearance for «Full-Scale Chemical Packaging» during scrolling.

**How to apply:** Preserve the progressive reveal rather than showing every card at full brightness immediately; keep the normal final colors and respect reduced-motion preferences.

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
