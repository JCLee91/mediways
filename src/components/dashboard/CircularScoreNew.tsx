interface CircularScoreNewProps {
  score: number;
  maxScore?: number;
  className?: string;
  size?: 'sm' | 'lg';
  isLoading?: boolean;
}

export default function CircularScoreNew({
  score,
  maxScore = 100,
  className = "",
  size = 'lg',
  isLoading = false
}: CircularScoreNewProps) {
  const percentage = (score / maxScore) * 100;
  
  // 크기별 설정
  const sizeConfig = {
    sm: {
      width: 50,
      height: 50,
      viewBox: "0 0 36 36",
      radius: 15.9155,
      circumference: 100,
      strokeWidth: 2.8,
      fontSize: "0.4em"
    },
    lg: {
      width: 70,
      height: 70,
      viewBox: "0 0 42 42",
      radius: 18.5,
      circumference: 100,
      strokeWidth: 2.8,
      fontSize: "0.5em"
    }
  };

  const config = sizeConfig[size];
  const strokeDashoffset = config.circumference - (percentage / 100) * config.circumference;
  
  // 점수에 따른 색상 결정
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 70) return '#3b82f6'; // blue  
    if (score >= 60) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const color = getScoreColor(score);

  return (
    <div className={`${className}`} style={{ width: config.width, height: config.height }}>
      <svg 
        className="block mx-auto max-w-full max-h-full"
        viewBox={config.viewBox}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Background circle */}
        <path
          className="fill-none stroke-gray-600"
          strokeWidth={config.strokeWidth}
          d={size === 'sm' 
            ? "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            : "M21 2.5 a 18.5 18.5 0 0 1 0 37 a 18.5 18.5 0 0 1 0 -37"
          }
        />
        
        {/* Progress circle */}
        <path
          className="fill-none stroke-linecap-round transition-all duration-1000 ease-in-out"
          stroke={color}
          strokeWidth={config.strokeWidth}
          strokeDasharray={`${percentage}, 100`}
          d={size === 'sm' 
            ? "M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            : "M21 2.5 a 18.5 18.5 0 0 1 0 37 a 18.5 18.5 0 0 1 0 -37"
          }
        />
        
        {/* Score text */}
        <text
          x={size === 'sm' ? '18' : '21'}
          y={size === 'sm' ? '20.35' : '24'}
          className="fill-white font-semibold text-center"
          style={{
            fontSize: config.fontSize,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            letterSpacing: '-0.02em',
            textAnchor: 'middle'
          }}
        >
          {isLoading ? '...' : score}
        </text>
      </svg>
    </div>
  );
}
