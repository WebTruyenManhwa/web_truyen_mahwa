import React from 'react';

interface MapProps {
  regions: {
    name: string;
    value: number;
    lat: number;
    lng: number;
  }[];
  center: {
    lat: number;
    lng: number;
  };
}

const Map: React.FC<MapProps> = ({ regions, center }) => {
  // Trong môi trường thực tế, đây sẽ là một component Google Maps hoặc Mapbox
  // Hiện tại, chúng ta chỉ hiển thị một placeholder đơn giản

  return (
    <div className="bg-gray-700 h-full w-full flex items-center justify-center rounded-lg">
      <div className="text-center">
        <p className="text-gray-400 mb-2">Bản đồ nhiệt truy cập</p>
        <p className="text-sm text-gray-500">
          (Trong môi trường thực tế, đây sẽ là Google Maps hoặc Mapbox với dữ liệu heatmap)
        </p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {regions.map((region, index) => (
            <div key={index} className="bg-gray-800 p-2 rounded text-sm">
              <span className="font-medium">{region.name}:</span> {region.value}%
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Map;
