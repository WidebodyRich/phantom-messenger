import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Package, Upload, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { createProduct, uploadProductImages, uploadDigitalFile } from '../../api/storefronts';
import toast from 'react-hot-toast';

const PRODUCT_TYPES = [
  { value: 'physical', label: 'Physical', desc: 'Ships to buyer' },
  { value: 'digital', label: 'Digital', desc: 'Instant delivery' },
  { value: 'service', label: 'Service', desc: 'Custom work' },
];

export default function CreateProduct({ storefrontId, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceSats, setPriceSats] = useState('');
  const [category, setCategory] = useState('');
  const [productType, setProductType] = useState('physical');
  const [stock, setStock] = useState('');
  const [tags, setTags] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [digitalFile, setDigitalFile] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleImages = (e) => {
    const files = Array.from(e.target.files || []);
    setImageFiles((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...previews]);
  };

  const removeImage = (idx) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Title required'); return; }
    if (!priceSats || parseInt(priceSats) <= 0) { toast.error('Valid price required'); return; }

    setCreating(true);
    try {
      // Create product
      const res = await createProduct({
        storefrontId,
        title: title.trim(),
        description: description.trim() || undefined,
        priceSats: parseInt(priceSats),
        category: category.trim() || undefined,
        productType,
        stock: stock ? parseInt(stock) : -1,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });

      const productData = res.data || res;
      const productId = productData.id;

      // Upload images
      if (imageFiles.length > 0 && productId) {
        try {
          await uploadProductImages(productId, imageFiles);
        } catch (e) {
          console.warn('[Product] Image upload failed:', e);
          toast.error('Product created but image upload failed');
        }
      }

      // Upload digital file
      if (digitalFile && productId) {
        try {
          await uploadDigitalFile(productId, digitalFile);
        } catch (e) {
          console.warn('[Product] Digital upload failed:', e);
          toast.error('Product created but digital file upload failed');
        }
      }

      onCreated?.(productData);
      toast.success('Product listed!');
    } catch (e) {
      toast.error(e.message || 'Failed to create product');
    }
    setCreating(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-phantom-charcoal flex items-center gap-2">
            <Package className="w-5 h-5 text-phantom-green" /> New Product
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-phantom-gray-50 flex items-center justify-center">
            <X className="w-5 h-5 text-phantom-gray-400" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Product Type */}
          <div>
            <label className="text-xs font-semibold text-phantom-charcoal mb-1.5 block">Type</label>
            <div className="flex gap-2">
              {PRODUCT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setProductType(t.value)}
                  className={`flex-1 py-2.5 rounded-xl text-center transition-all ${
                    productType === t.value
                      ? 'bg-phantom-green text-white'
                      : 'bg-phantom-gray-50 text-phantom-gray-500 hover:bg-phantom-gray-100'
                  }`}
                >
                  <p className="text-xs font-semibold">{t.label}</p>
                  <p className="text-[9px] mt-0.5 opacity-70">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Product title *"
            maxLength={200}
            className="w-full bg-phantom-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-phantom-green/30"
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Product description..."
            maxLength={5000}
            rows={3}
            className="w-full bg-phantom-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-phantom-green/30 resize-none"
          />

          {/* Price */}
          <div>
            <label className="text-xs font-semibold text-phantom-charcoal mb-1.5 block">Price (satoshis)</label>
            <input
              type="number"
              value={priceSats}
              onChange={(e) => setPriceSats(e.target.value)}
              placeholder="e.g. 50000"
              min="1"
              className="w-full bg-phantom-gray-50 rounded-xl px-4 py-3 text-sm font-mono outline-none border border-transparent focus:border-phantom-green/30"
            />
          </div>

          {/* Stock */}
          <div>
            <label className="text-xs font-semibold text-phantom-charcoal mb-1.5 block">Stock (leave empty for unlimited)</label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Unlimited"
              min="0"
              className="w-full bg-phantom-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-phantom-green/30"
            />
          </div>

          {/* Category & Tags */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="bg-phantom-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-phantom-green/30"
            />
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma sep)"
              className="bg-phantom-gray-50 rounded-xl px-4 py-3 text-sm outline-none border border-transparent focus:border-phantom-green/30"
            />
          </div>

          {/* Product Images */}
          <div>
            <label className="text-xs font-semibold text-phantom-charcoal mb-1.5 block">Images</label>
            <div className="flex gap-2 flex-wrap">
              {imagePreviews.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-phantom-gray-200 flex items-center justify-center cursor-pointer hover:border-phantom-green/30 transition-colors">
                <ImageIcon className="w-5 h-5 text-phantom-gray-300" />
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
              </label>
            </div>
          </div>

          {/* Digital File */}
          {productType === 'digital' && (
            <div>
              <label className="text-xs font-semibold text-phantom-charcoal mb-1.5 block">Digital File (delivered to buyer after payment)</label>
              <label className="flex items-center gap-3 p-3 bg-phantom-gray-50 rounded-xl cursor-pointer hover:bg-phantom-gray-100 transition-colors">
                <FileText className="w-5 h-5 text-phantom-gray-400 flex-shrink-0" />
                <span className="text-sm text-phantom-gray-500 truncate">
                  {digitalFile ? digitalFile.name : 'Choose file...'}
                </span>
                <input type="file" className="hidden" onChange={(e) => setDigitalFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={creating || !title.trim() || !priceSats}
            className="w-full py-3.5 bg-phantom-green text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-phantom-green-dark transition-colors disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
            {creating ? 'Creating...' : 'List Product'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
