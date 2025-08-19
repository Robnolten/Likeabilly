import React from "react";

const NewStepProgressBar = ({ activeStep, onStepClick }: { activeStep: number; onStepClick: (step: number) => void }) => {
  const steps = [
    { number: 1, label: "Afmetingen" },
    { number: 2, label: "Planken" },
    { number: 3, label: "Materiaal" },
    { number: 4, label: "Overzicht" }
  ];

  return (
    <div className="custom-steps-container mb-8 mt-2 pt-2">
      <div className="custom-steps-wrapper">
        {steps.map((step) => (
          <div 
            key={step.number}
            className="custom-step-item"
            onClick={() => onStepClick(step.number)}
          >
            <div className={`custom-step-bubble ${
              activeStep === step.number 
                ? 'custom-step-active' 
                : step.number < activeStep 
                  ? 'custom-step-completed' 
                  : 'custom-step-incomplete'
            }`}>
              {step.number}
            </div>
            <div className={`custom-step-label ${
              activeStep === step.number 
                ? 'custom-label-active' 
                : step.number < activeStep 
                  ? 'custom-label-completed' 
                  : 'custom-label-incomplete'
            }`}>
              {step.label}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .custom-steps-container {
          position: relative;
          padding-top: 10px;
          padding-bottom: 20px;
          width: 100%;
        }
        .custom-steps-wrapper {
          position: relative;
          display: flex;
          justify-content: space-around;
          z-index: 3;
          max-width: 90%;
          margin: 0 auto;
        }
        .custom-step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          position: relative;
          padding-bottom: 30px;
        }
        .custom-step-bubble {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          background-color: white;
          z-index: 5;
        }
        .custom-step-active {
          background-color: #818cf8;
          color: white;
          box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);
        }
        .custom-step-completed {
          background-color: #a5b4fc;
          color: white;
        }
        .custom-step-incomplete {
          background-color: white;
          color: #6b7280;
          border: 2px solid #d1d5db;
        }
        .custom-step-label {
          font-size: 0.75rem;
          font-weight: 500;
          position: absolute;
          top: 36px;
          text-align: center;
          max-width: 80px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .custom-label-active {
          color: #4f46e5;
        }
        .custom-label-completed {
          color: #6366f1;
        }
        .custom-label-incomplete {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default NewStepProgressBar;