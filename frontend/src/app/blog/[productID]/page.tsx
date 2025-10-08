// export default async function ProductDetails({
//     params,
// }: {
//     params: Promise<{ productID: string }>;
// }){
//     const { productID } = await params;
//     return (
//     <div>
//       <h1>Details abt product {productID}</h1>
//     </div>
//   );
// }
"use client";
import { useParams } from "next/navigation";                    
export default function Page() { 
    const params = useParams();
    const productID = params.productID;
    return (
        <div>
        <h1>Welcome to the blog</h1>
        <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
        </ul>
        </div>
    );
    }                   
