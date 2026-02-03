'use client';

export default function Navbar(){
    return(
        <div className="flex flex-col">
            <div className="flex flex-row justify-between items-center p-4 bg-gray-800 text-white">
                <div className="text-xl font-bold">MyWay</div>
                <div className="flex space-x-4">
                    <button className="hover:text-blue-300">Home</button>
                    <button className="hover:text-blue-300">About</button>
                    <button className="hover:text-blue-300">Contact</button>
                </div>
            </div>
        </div>
    );
}