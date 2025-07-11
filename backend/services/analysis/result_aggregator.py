
class ResultAggregator:
    """Aggregates results from the analysis pipeline into a structured format."""

    def __init__(self, pipeline_results):
        self.results = pipeline_results

    def aggregate(self):
        """Combines pipeline results into the final JSON structure."""
        return {
            'summary': self.results.get('summary', 'Error generating summary.'),
            'components': self.results.get('components', []),
            'dependencies': self.results.get('dependencies', []),
            'dependents': self.results.get('dependents', [])
        }
