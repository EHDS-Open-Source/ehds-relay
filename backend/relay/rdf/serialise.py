"""Serialise a metadata graph. Every format is written from the same graph."""

from rdflib import Graph

TURTLE_MEDIA_TYPE = "text/turtle"


def to_turtle(graph: Graph) -> str:
    return graph.serialize(format="turtle")
