import { describe, expect, it } from 'vitest';
import { render, screen } from '../../test/helpers';
import Repeater from './Repeater';

describe('Repeater', () => {
  const items = [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' },
    { id: '3', name: 'Gamma' },
  ];

  it('renders all items', () => {
    render(<Repeater items={items} render={(item) => <span key={item.id}>{item.name}</span>} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('renders empty state when items is empty array', () => {
    render(
      <Repeater
        items={[]}
        render={(item: { id: string }) => <span key={item.id}>Item</span>}
        empty={<p>No items found</p>}
      />,
    );
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders empty state when items is null', () => {
    render(<Repeater items={null} render={() => <span>Item</span>} empty={<p>Nothing here</p>} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders loader when loading is true (ignores items)', () => {
    render(
      <Repeater
        items={items}
        loading={true}
        loader={<p>Loading...</p>}
        render={(item) => <span key={item.id}>{item.name}</span>}
      />,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });

  it('renders items when loading is false', () => {
    render(
      <Repeater
        items={items}
        loading={false}
        loader={<p>Loading...</p>}
        render={(item) => <span key={item.id}>{item.name}</span>}
      />,
    );
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('passes index to render function', () => {
    render(
      <Repeater
        items={items}
        render={(item, index) => (
          <span key={item.id}>
            {index}-{item.name}
          </span>
        )}
      />,
    );
    expect(screen.getByText('0-Alpha')).toBeInTheDocument();
    expect(screen.getByText('1-Beta')).toBeInTheDocument();
    expect(screen.getByText('2-Gamma')).toBeInTheDocument();
  });
});
