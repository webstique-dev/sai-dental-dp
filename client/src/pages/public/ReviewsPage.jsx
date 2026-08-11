import Seo from '../../components/public/Seo'
import { Section, SectionHeading, TestimonialCard, CtaBanner, ResponsiveGrid } from '../../components/public/Sections'
import { TESTIMONIALS } from '../../data/clinic'

export default function ReviewsPage() {
  return (
    <>
      <Seo
        title="Patient Reviews & Testimonials"
        description="Read real patient stories about Sai Dental Clinic — gentle care, honest pricing and smiles transformed."
      />

      <section className="page-hero">
        <div className="container page-hero-inner">
          <SectionHeading eyebrow="Patient stories" title="Reviews & testimonials" lead="We're proud of the trust our patients place in us. Here's what they have to say." />
        </div>
      </section>

      <Section>
        <ResponsiveGrid cols={2}>
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} testimonial={t} />
          ))}
        </ResponsiveGrid>
      </Section>

      <CtaBanner title="Your smile is our best review" lead="Join thousands of happy patients — experience the Sai Dental difference." />
    </>
  )
}