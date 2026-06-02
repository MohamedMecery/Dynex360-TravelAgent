# TravelOS Knowledge Base

**Version:** 1.1 — Phase 5 RAG corpus  
**Scope:** Knowledge Agent (primary), Booking Agent, Support Agent (shared FAQ)  
**Last Updated:** 2026-06-02

---

## Indexed Content

### Business Rules

1. Only published packages can be booked
2. Bookings start as drafts and require agent confirmation
3. Payment recording is handled by Finance Officers, not the AI agent
4. Booking reference format: BKG-{TENANT}-{NUMBER}
5. Payment status: unpaid → partial → paid based on amounts recorded
6. Cancelled bookings cannot receive new payments

### Booking Workflow

1. Select or create customer
2. Select published package
3. Add travelers with passport details
4. Add line items (auto-calculated from package pricing)
5. Save as draft
6. Sales agent confirms → status: confirmed
7. Finance officer records payments
8. After travel → status: completed

### Package Pricing Tiers

- **Adult:** Standard pricing for ages 12+
- **Child:** Reduced pricing for ages 2-11
- **Infant:** Minimal pricing for under 2

### Payment Methods

- Cash
- Bank Transfer
- Card
- Other

### Customer Types

- **Individual:** Personal travelers
- **Corporate:** Business clients with company name

---

## RAG Configuration

```yaml
embedding_model: text-embedding-3-small
chunk_size: 512
chunk_overlap: 50
top_k: 5
similarity_threshold: 0.7
tenant_filter: true
```

## Data Sources (Phase 5)

| Source | `document_type` | Update Frequency |
|--------|-----------------|------------------|
| Published packages (title, description, itinerary) | `package` | On package publish |
| Policies & SOPs | `policy`, `sop` | Admin upload |
| Supplier contracts | `contract` | Admin upload |
| Pricing notes | `pricing` | Manual / sync |
| FAQ entries | `faq` | Manual |
| Business rules (this document) | `sop` | Manual |

Stored in `knowledge_documents` + `knowledge_chunks` per [DatabaseDesign.md](../../docs/03-Architecture/DatabaseDesign.md) §8 (recommended).

## Sample FAQ

**Q: Can I book a draft package?**  
A: No, only published packages are available for booking.

**Q: How do I handle partial payments?**  
A: Record each payment separately. The system auto-updates payment status to partial or paid.

**Q: Can I cancel a confirmed booking?**  
A: Yes, any active booking can be cancelled. Cancelled bookings cannot receive new payments.

**Q: What traveler information is required?**  
A: First name, last name are required. Date of birth and passport number are recommended.

---

## Future Expansion (POST-MVP)

- Supplier inventory details
- Destination guides
- Visa and travel document requirements
- Multi-currency pricing information
