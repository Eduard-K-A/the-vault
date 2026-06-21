import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from '@/components/EmptyState';
import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { createProduct } from '../factories/models';

describe('redesign feature components', () => {
  it('renders empty states without the developer label chip', async () => {
    const view = await render(<EmptyState title="No products yet" description="Add your first product." />);
    const output = JSON.stringify(view.toJSON());

    expect(screen.getByText('No products yet')).toBeTruthy();
    expect(output).not.toContain('Empty state');
  });

  it('uses the redesigned default search placeholder and disabled scan chip', async () => {
    const scan = jest.fn();

    await render(<SearchBar value="" onChangeText={jest.fn()} onScanPress={scan} />);

    expect(screen.getByPlaceholderText('Search products...')).toBeTruthy();
    expect(screen.getByLabelText('Scan barcode')).toBeTruthy();
  });

  it('uses a neutral product image placeholder instead of a product initial', async () => {
    const view = await render(<ProductCard product={createProduct({ name: 'Tablet Stand', image_url: null })} />);
    const output = JSON.stringify(view.toJSON());

    expect(output).not.toContain('"children":["T"]');
    expect(output).toContain('Product image placeholder');
  });

  it('routes product edit button presses to the edit handler', async () => {
    const product = createProduct({ name: 'Tablet Stand' });
    const onEdit = jest.fn();

    await render(<ProductCard product={product} onEdit={onEdit} />);

    fireEvent.press(screen.getByLabelText('Edit Tablet Stand'));

    expect(onEdit).toHaveBeenCalledWith(product);
  });
});
