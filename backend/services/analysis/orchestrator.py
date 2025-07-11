
from .pipeline import AnalysisPipeline
from .result_aggregator import ResultAggregator
from .processors.summary_processor import SummaryProcessor
from .processors.component_processor import ComponentProcessor
from .processors.dependency_processor import DependencyProcessor
from .processors.dependent_processor import DependentProcessor

def run_analysis(project_path: str, file_path: str) -> dict:
    """
    Orchestrates the code analysis pipeline for a given file.
    """
    processors = {
        'summary': SummaryProcessor(project_path, file_path),
        'components': ComponentProcessor(project_path, file_path),
        'dependencies': DependencyProcessor(project_path, file_path),
        'dependents': DependentProcessor(project_path, file_path)
    }

    pipeline = AnalysisPipeline(processors)
    pipeline_results = pipeline.run()

    aggregator = ResultAggregator(pipeline_results)
    final_result = aggregator.aggregate()

    return final_result
