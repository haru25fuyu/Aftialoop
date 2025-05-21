import Header from '../component/Header';
import Footer from '../component/Footer';


const NotFound = () => {
    return (
        <>
            <header>
                <Header />
            </header>

            <main className="container mx-auto px-4 py-8">
                <div className="text-center mt-20">

                    <h1 className="text-4xl font-bold">404 - ページが見つかりません</h1>
                    <p className="text-gray-600 mt-2">URLが間違っているか、ページが移動された可能性があります。</p>

                </div>
            </main>

            <footer>
                <Footer />
            </footer>
        </>
    );
};

export default NotFound;