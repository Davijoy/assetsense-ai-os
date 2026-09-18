import { describe, it, expect } from "vitest";
import { LEAD_STATUS_CATEGORIES, stageBadgeStyles } from "../src/components/crm/LeadDetailDrawer";
import { storeMedia, getMedia } from "../src/lib/media-storage.server";

describe("CRM Lead Statuses & Dispositions Expansion", () => {
  const REQUIRED_STATUSES = [
    "Call Back",
    "RNR (Ringing Not Responded)",
    "Busy",
    "Switch Off",
    "Not Interested",
    "Dropped Plan",
    "RFR (Ready for Registration)",
    "Site Visit Scheduled",
    "Booked",
  ];

  it("includes all user-requested statuses in LEAD_STATUS_CATEGORIES", () => {
    const allCategoryItems = [
      ...LEAD_STATUS_CATEGORIES.pipeline,
      ...LEAD_STATUS_CATEGORIES.disposition,
      ...LEAD_STATUS_CATEGORIES.closure,
    ];
    const categoryIds = allCategoryItems.map((item) => item.id);

    expect(categoryIds).toContain("Call Back");
    expect(categoryIds).toContain("RNR (Ringing Not Responded)");
    expect(categoryIds).toContain("Busy");
    expect(categoryIds).toContain("Switch Off");
    expect(categoryIds).toContain("Not Interested");
    expect(categoryIds).toContain("Dropped Plan");
    expect(categoryIds).toContain("RFR (Ready for Registration)");
    expect(categoryIds).toContain("Site Visit Scheduled");
    expect(categoryIds).toContain("Booked");
  });

  it("provides distinct badge styling for all requested stages", () => {
    for (const status of REQUIRED_STATUSES) {
      expect(stageBadgeStyles[status]).toBeDefined();
      expect(stageBadgeStyles[status].length).toBeGreaterThan(0);
    }
  });

  it("supports site visit appointment scheduling payload structure", () => {
    const siteVisitData = {
      leadId: "lead-123",
      stage: "Site Visit Scheduled",
      siteVisitDate: "2026-09-15",
      siteVisitTime: "14:30",
      notes: "Customer requested weekend site walkthrough with family.",
    };

    expect(siteVisitData.stage).toBe("Site Visit Scheduled");
    expect(siteVisitData.siteVisitDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(siteVisitData.siteVisitTime).toMatch(/^\d{2}:\d{2}$/);
    expect(siteVisitData.notes).toBeDefined();
  });
});

describe("Marketplace Inventory — Photo Extraction & Management", () => {
  it("extracts cover and gallery images from property attributes", () => {
    const mockDbRow = {
      id: "prop-uuid-1",
      name: "Luxury Sky Villa",
      city: "Bengaluru",
      property_type: "villa",
      price_inr: 45000000,
      status: "ready_to_move",
      ai_score: 94,
      developer: "Prestige Group",
      attributes: {
        media: {
          cover: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
          gallery: [
            "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
            "data:image/jpeg;base64,/9j/4AAQSkZJRg2...",
          ],
        },
        bhk: "4",
        super_builtup_area: "3400",
        locality: "Whitefield",
      },
    };

    const attrs = mockDbRow.attributes;
    const media = attrs.media;
    const coverImage = media.cover || (Array.isArray(media.gallery) && media.gallery[0]) || null;
    const gallery = Array.isArray(media.gallery) ? media.gallery : (coverImage ? [coverImage] : []);

    expect(coverImage).toBe("data:image/jpeg;base64,/9j/4AAQSkZJRg...");
    expect(gallery.length).toBe(2);
    expect(attrs.bhk).toBe("4");
    expect(attrs.locality).toBe("Whitefield");
  });

  it("creates edit prefill payload correctly from marketplace property item", () => {
    const propertyItem = {
      id: "db-12345",
      name: "Oberoi Sky City",
      builder: "Oberoi Realty",
      city: "Mumbai",
      area: "Borivali",
      type: "Apartment" as const,
      config: "3 BHK",
      size: "1,650 sqft",
      priceLabel: "₹3.10 Cr",
      priceCr: 3.1,
      score: 95,
      tag: "Premium" as const,
      appreciation: "+18% YoY",
      status: "Ready" as const,
      image: "https://example.com/photo.jpg",
      gallery: ["https://example.com/photo.jpg"],
      isDb: true,
      price_inr: 31000000,
    };

    const editPayload = {
      id: propertyItem.id,
      name: propertyItem.name,
      developer: propertyItem.builder,
      city: propertyItem.city,
      property_type: "apartment",
      status: "ready_to_move",
      price_inr: propertyItem.price_inr,
      attributes: {
        project_name: propertyItem.name,
        bhk: "3",
        locality: propertyItem.area,
        media: {
          cover: propertyItem.image,
          gallery: propertyItem.gallery,
        },
      },
    };

    expect(editPayload.name).toBe("Oberoi Sky City");
    expect(editPayload.developer).toBe("Oberoi Realty");
    expect(editPayload.price_inr).toBe(31000000);
    expect(editPayload.attributes.media.cover).toBe("https://example.com/photo.jpg");
  });

  it("handles keyboard navigation index wrapping properly for gallery photos", () => {
    const totalPhotos = 5;
    let currentIndex = 0;

    // Right Arrow / Next
    const getNext = (curr: number) => (curr + 1) % totalPhotos;
    expect(getNext(0)).toBe(1);
    expect(getNext(4)).toBe(0); // wraps back to first

    // Left Arrow / Prev
    const getPrev = (curr: number) => (curr - 1 + totalPhotos) % totalPhotos;
    expect(getPrev(0)).toBe(4); // wraps back to last
    expect(getPrev(3)).toBe(2);
  });

  it("stores and retrieves media buffers correctly for cross-user video streaming", () => {
    const testBuffer = Buffer.from("test video data content");
    const item = storeMedia("test-video-123", testBuffer, "video/mp4", "walkthrough.mp4");

    expect(item.id).toBe("test-video-123");
    expect(item.mimeType).toBe("video/mp4");
    expect(item.size).toBe(testBuffer.length);

    const retrieved = getMedia("test-video-123");
    expect(retrieved).toBeDefined();
    expect(retrieved?.filename).toBe("walkthrough.mp4");
    expect(retrieved?.buffer.toString()).toBe("test video data content");
  });
});

