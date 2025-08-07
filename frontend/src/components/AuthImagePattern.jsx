const AuthImagePattern = ({ title, subtitle }) => {
  return (
    <div className="flex items-center justify-center bg-base-200 p-6 lg:p-12 min-h-[200px] lg:min-h-screen">
      <div className="max-w-md text-center">
        <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-6 lg:mb-8">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl lg:rounded-2xl bg-primary/10 ${
                i % 2 === 0 ? "animate-pulse" : ""
              }`}
            />
          ))}
        </div>
        <h2 className="text-lg lg:text-2xl font-bold mb-2 lg:mb-4">{title}</h2>
        <p className="text-base-content/60 text-sm lg:text-base">{subtitle}</p>
      </div>
    </div>
  );
};

export default AuthImagePattern;
