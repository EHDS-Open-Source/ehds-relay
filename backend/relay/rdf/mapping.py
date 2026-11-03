"""Map dataset metadata to a Health DCAT-AP rdflib graph.

Pure functions: no I/O, no database. Every output format is serialised from the graph
built here, so all formats describe the same content. Nested things without an identity
of their own (organisations, contact points, distributions, periods, variables) are
blank nodes; vocabulary terms are their URIs.
"""

from datetime import date

from pydantic import AnyUrl
from rdflib import BNode, Graph, Literal, URIRef
from rdflib.namespace import RDF

from relay.dtos.dataset_metadata import (
    ContactPoint,
    DatasetMetadata,
    Distribution,
    LangText,
    Organisation,
    Publisher,
    TemporalCoverage,
    Term,
    Variable,
)
from relay.rdf.vocab import (
    ACCESS_RIGHTS_URI,
    CONCEPT_CLASSES,
    CSVW,
    CV,
    DATASET_COUNT_FIELDS,
    DATASET_LITERAL_FIELDS,
    DATASET_ORGANISATION_FIELDS,
    DATASET_TERM_FIELDS,
    DCAT,
    DCATAP,
    DCT,
    DPV,
    FOAF,
    HEALTH_DATA_THEME,
    HEALTHDCATAP,
    PREFIXES,
    RDFS,
    SKOS,
    VCARD,
    XSD,
)

_LEGAL_RESOURCE = DATASET_TERM_FIELDS["applicable_legislation"].range


def new_graph() -> Graph:
    """An empty graph with every Health DCAT-AP prefix bound."""
    g = Graph(bind_namespaces="core")
    for prefix, ns in PREFIXES.items():
        g.bind(prefix, ns, override=True, replace=True)
    return g


def dataset_graph(subject: URIRef, meta: DatasetMetadata) -> Graph:
    """A new graph describing one dataset, identified by `subject`."""
    g = new_graph()
    add_dataset(g, subject, meta)
    return g


def add_dataset(g: Graph, subject: URIRef, meta: DatasetMetadata) -> None:
    """Add one dataset to `g` (e.g. a catalogue graph holding several datasets)."""
    g.add((subject, RDF.type, DCAT.Dataset))
    g.add((subject, DCAT.theme, HEALTH_DATA_THEME))

    for text in meta.title:
        g.add((subject, DCT.title, _lang(text)))
    for text in meta.description:
        g.add((subject, DCT.description, _lang(text)))

    for field, prop in DATASET_TERM_FIELDS.items():
        terms: list[Term] = getattr(meta, field)
        for term in terms:
            g.add((subject, prop.predicate, _term(g, term, prop.range)))

    for field, predicate in DATASET_LITERAL_FIELDS.items():
        values: list[str] = getattr(meta, field)
        for value in values:
            g.add((subject, predicate, Literal(value)))

    for field, predicate in DATASET_COUNT_FIELDS.items():
        count: int | None = getattr(meta, field)
        if count is not None:
            g.add((subject, predicate, Literal(count, datatype=XSD.nonNegativeInteger)))

    for field, predicate in DATASET_ORGANISATION_FIELDS.items():
        org: Organisation | None = getattr(meta, field)
        if org is not None:
            g.add((subject, predicate, _organisation(g, org)))

    if meta.access_rights is not None:
        rights = ACCESS_RIGHTS_URI[meta.access_rights]
        g.add((rights, RDF.type, DCT.RightsStatement))
        g.add((subject, DCT.accessRights, rights))

    if meta.structured_data is not None:
        g.add((subject, HEALTHDCATAP.hasStructuredData, Literal(meta.structured_data)))
    if meta.variables:
        g.add((subject, HEALTHDCATAP.hasVariables, _variables(g, meta)))

    # Release 8 has no yes/no property: dpv:hasPersonalData points at the kinds of
    # personal data held. The form only asks whether there is any, so "yes" becomes one
    # unspecified dpv:PersonalData and "no" is left out.
    if meta.has_personal_data:
        personal = BNode()
        g.add((personal, RDF.type, DPV.PersonalData))
        g.add((subject, DPV.hasPersonalData, personal))

    if meta.provenance and meta.provenance.strip():
        statement = BNode()
        g.add((statement, RDF.type, DCT.ProvenanceStatement))
        g.add((statement, RDFS.label, Literal(meta.provenance)))
        g.add((subject, DCT.provenance, statement))

    if meta.temporal_coverage is not None:
        period = _period(g, meta.temporal_coverage)
        if period is not None:
            g.add((subject, DCT.temporal, period))

    for distribution in meta.distributions:
        g.add((subject, DCAT.distribution, _distribution(g, distribution)))

    for contact in meta.contact_points:
        g.add((subject, DCAT.contactPoint, _vcard(g, contact)))


def _uri(url: AnyUrl) -> URIRef:
    return URIRef(str(url))


def _lang(text: LangText) -> Literal:
    return Literal(text.text, lang=text.lang)


def _term(g: Graph, term: Term, range_class: URIRef) -> URIRef:
    node = _uri(term.uri)
    g.add((node, RDF.type, range_class))
    label = SKOS.prefLabel if range_class in CONCEPT_CLASSES else RDFS.label
    g.add((node, label, Literal(term.label)))
    return node


def _organisation(g: Graph, org: Organisation) -> BNode:
    node = BNode()
    g.add((node, RDF.type, FOAF.Agent))
    g.add((node, FOAF.name, Literal(org.name)))
    if org.type is not None:
        g.add((node, DCT.type, _term(g, org.type, SKOS.Concept)))
    if isinstance(org, Publisher) and org.description:
        g.add((node, DCT.description, Literal(org.description)))
    if org.contact_point is not None:
        g.add((node, CV.contactPoint, _cv_contact(g, org.contact_point)))
    return node


def _cv_contact(g: Graph, contact: ContactPoint) -> BNode:
    """Contact point of an organisation (cv:ContactPoint, email as a plain literal)."""
    node = BNode()
    g.add((node, RDF.type, CV.ContactPoint))
    # cv:ContactPoint has no name property; rdfs:label keeps the name without inventing one
    g.add((node, RDFS.label, Literal(contact.name)))
    g.add((node, CV.email, Literal(contact.email)))
    return node


def _vcard(g: Graph, contact: ContactPoint) -> BNode:
    """Contact point of the dataset (vcard:Kind, email as a mailto: IRI)."""
    node = BNode()
    g.add((node, RDF.type, VCARD.Kind))
    g.add((node, VCARD.fn, Literal(contact.name)))
    g.add((node, VCARD.hasEmail, URIRef(f"mailto:{contact.email}")))
    return node


def _period(g: Graph, coverage: TemporalCoverage) -> BNode | None:
    if coverage.start is None and coverage.end is None:
        return None
    node = BNode()
    g.add((node, RDF.type, DCT.PeriodOfTime))
    if coverage.start is not None:
        g.add((node, DCAT.startDate, _date(coverage.start)))
    if coverage.end is not None:
        g.add((node, DCAT.endDate, _date(coverage.end)))
    return node


def _date(day: date) -> Literal:
    return Literal(day.isoformat(), datatype=XSD.date)


def _distribution(g: Graph, dist: Distribution) -> BNode:
    node = BNode()
    g.add((node, RDF.type, DCAT.Distribution))
    if dist.title:
        g.add((node, DCT.title, Literal(dist.title)))
    if dist.description:
        g.add((node, DCT.description, Literal(dist.description)))
    g.add((node, DCAT.accessURL, _uri(dist.access_url)))
    if dist.format is not None:
        g.add((node, DCT["format"], _term(g, dist.format, DCT.MediaTypeOrExtent)))
    for legislation in dist.applicable_legislation:
        g.add((node, DCATAP.applicableLegislation, _term(g, legislation, _LEGAL_RESOURCE)))
    return node


def _variables(g: Graph, meta: DatasetMetadata) -> BNode:
    """The variables as a CSVW table group holding one table.

    The form has no titles for the group or table, which the specification requires,
    so both are named after the dataset.
    """
    title = meta.display_title() or "Dataset"
    group, table = BNode(), BNode()
    g.add((group, RDF.type, CSVW.TableGroup))
    g.add((group, DCT.title, Literal(f"Variables of {title}")))
    g.add((group, CSVW.table, table))
    g.add((table, RDF.type, CSVW.Table))
    g.add((table, DCT.title, Literal(title)))
    for variable in meta.variables:
        g.add((table, CSVW.column, _column(g, variable)))
    return group


def _column(g: Graph, variable: Variable) -> BNode:
    node = BNode()
    g.add((node, RDF.type, CSVW.Column))
    g.add((node, CSVW.name, Literal(variable.name)))
    g.add((node, CSVW.title, Literal(variable.name)))
    g.add((node, DCT.description, Literal(variable.definition)))
    g.add((node, CSVW.datatype, Literal(variable.data_type)))
    if variable.coding_system is not None:
        g.add((node, CSVW.propertyUrl, _uri(variable.coding_system)))
    return node
