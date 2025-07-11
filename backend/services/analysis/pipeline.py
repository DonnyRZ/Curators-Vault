
class AnalysisPipeline:
    """Represents a pipeline of analysis processors to be executed."""

    def __init__(self, processors):
        self.processors = processors

    def run(self):
        """Runs all processors in the pipeline and collects their results."""
        results = {}
        for processor_name, processor_instance in self.processors.items():
            try:
                results[processor_name] = processor_instance.process()
            except Exception as e:
                print(f"Error running processor {processor_name}: {e}")
                results[processor_name] = None
        return results
