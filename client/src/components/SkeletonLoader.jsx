import '../styles/SkeletonLoader.css';

export const SkeletonLoader = ({ width = '100%', height = '20px', borderRadius = '4px' }) => {
    return (
        <div
            className="skeleton-loader"
            style={{ width, height, borderRadius }}
        />
    );
};

export const SkeletonCard = () => {
    return (
        <div className="skeleton-card">
            <SkeletonLoader width="100%" height="200px" borderRadius="8px" />
            <SkeletonLoader width="80%" height="20px" borderRadius="4px" />
            <SkeletonLoader width="60%" height="16px" borderRadius="4px" />
        </div>
    );
};

export const SkeletonGrid = ({ count = 4 }) => {
    return (
        <div className="skeleton-grid">
            {Array(count)
                .fill(0)
                .map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
        </div>
    );
};

export const SkeletonTable = ({ rows = 5, columns = 4 }) => {
    return (
        <div className="skeleton-table">
            <div className="skeleton-table-header">
                {Array(columns)
                    .fill(0)
                    .map((_, i) => (
                        <SkeletonLoader key={i} width="100%" height="20px" />
                    ))}
            </div>
            {Array(rows)
                .fill(0)
                .map((_, rowI) => (
                    <div key={rowI} className="skeleton-table-row">
                        {Array(columns)
                            .fill(0)
                            .map((_, colI) => (
                                <SkeletonLoader
                                    key={colI}
                                    width="100%"
                                    height="40px"
                                />
                            ))}
                    </div>
                ))}
        </div>
    );
};

export const SkeletonStats = () => {
    return (
        <div className="skeleton-stats">
            {Array(4)
                .fill(0)
                .map((_, i) => (
                    <div key={i} className="skeleton-stat-card">
                        <SkeletonLoader width="40px" height="40px" borderRadius="8px" />
                        <SkeletonLoader width="60px" height="24px" />
                        <SkeletonLoader width="100px" height="16px" />
                    </div>
                ))}
        </div>
    );
};

export default SkeletonLoader;
