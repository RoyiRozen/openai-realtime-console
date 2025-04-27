import { useState } from "react";
import { Award, CheckCircle, XCircle, BarChart2 } from "react-feather";
import Button from "./Button";

export default function EvaluationPanel({ sessionId, onClose }) {
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching evaluation: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEvaluation(data);
    } catch (err) {
      console.error("Failed to fetch evaluation:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate color based on score
  const getScoreColor = (score) => {
    if (score >= 0.7) return "text-green-600";
    if (score >= 0.4) return "text-yellow-600";
    return "text-red-600";
  };
  
  // Calculate width for progress bar
  const getProgressWidth = (score) => {
    return `${Math.round(score * 100)}%`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <BarChart2 className="mr-2" />
            Communication Evaluation
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        
        {!evaluation && !loading && !error && (
          <div className="text-center py-8">
            <p className="mb-4">Generate an evaluation of your communication skills based on the scenario guidelines.</p>
            <Button
              onClick={fetchEvaluation}
              className="bg-blue-500"
              icon={<Award size={16} />}
            >
              Evaluate My Performance
            </Button>
          </div>
        )}
        
        {loading && (
          <div className="text-center py-8">
            <p className="mb-2">Analyzing communication skills...</p>
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-4">
            <p>Error: {error}</p>
            <Button 
              onClick={fetchEvaluation} 
              className="bg-red-500 text-white mt-2"
            >
              Try Again
            </Button>
          </div>
        )}
        
        {evaluation && (
          <div>
            {/* Overall score */}
            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Overall Communication Score</h3>
                <span className={`font-bold text-lg ${getScoreColor(evaluation.overall_score)}`}>
                  {(evaluation.overall_score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${
                    evaluation.overall_score >= 0.7 ? 'bg-green-600' : 
                    evaluation.overall_score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: getProgressWidth(evaluation.overall_score) }}
                ></div>
              </div>
            </div>
            
            {/* Steps evaluation */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Communication Steps</h3>
              <div className="space-y-3">
                {evaluation.steps_evaluation.map((step, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center">
                        {step.keywords_found ? 
                          <CheckCircle size={16} className="text-green-500 mr-2" /> : 
                          <XCircle size={16} className="text-red-500 mr-2" />
                        }
                        <span className="font-medium">{step.step_name}</span>
                      </div>
                      <span className={`${getScoreColor(step.score)}`}>
                        {(step.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    
                    {/* Progress bar for step score */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                      <div 
                        className={`h-1.5 rounded-full ${
                          step.score >= 0.7 ? 'bg-green-600' : 
                          step.score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: getProgressWidth(step.score) }}
                      ></div>
                    </div>
                    
                    {/* Keywords found */}
                    {step.matching_keywords.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        Keywords detected: <span className="font-medium">{step.matching_keywords.join(", ")}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Detailed feedback */}
            <div>
              <h3 className="font-semibold mb-2">Detailed Feedback</h3>
              <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-line text-gray-700">
                {evaluation.feedback}
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t flex justify-end">
              <Button
                onClick={onClose}
                className="bg-gray-500"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 