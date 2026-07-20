import { describe, expect, it } from 'vitest';
import { render, screen } from '../../test/helpers';
import Render from './Render';

describe('Render (base)', () => {
  it('renders children when condition is true', () => {
    render(
      <Render in={true}>
        <span>Visible</span>
      </Render>,
    );
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });

  it('does not render children when condition is false', () => {
    render(
      <Render in={false}>
        <span>Hidden</span>
      </Render>,
    );
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders "then" prop when condition is true', () => {
    render(<Render in={true} then={<span>Then Content</span>} />);
    expect(screen.getByText('Then Content')).toBeInTheDocument();
  });

  it('renders fallback when condition is false', () => {
    render(
      <Render in={false} fallback={<span>Fallback</span>}>
        <span>Main</span>
      </Render>,
    );
    expect(screen.queryByText('Main')).not.toBeInTheDocument();
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });

  it('prefers "then" prop over children when condition is true', () => {
    render(
      <Render in={true} then={<span>Then</span>}>
        <span>Children</span>
      </Render>,
    );
    expect(screen.getByText('Then')).toBeInTheDocument();
    expect(screen.queryByText('Children')).not.toBeInTheDocument();
  });
});

describe('Render.If + Render.Else', () => {
  it('renders then-children when condition is true', () => {
    render(
      <Render.If in={true}>
        <span>Then Branch</span>
        <Render.Else>
          <span>Else Branch</span>
        </Render.Else>
      </Render.If>,
    );
    expect(screen.getByText('Then Branch')).toBeInTheDocument();
    expect(screen.queryByText('Else Branch')).not.toBeInTheDocument();
  });

  it('renders Render.Else when condition is false', () => {
    render(
      <Render.If in={false}>
        <span>Then Branch</span>
        <Render.Else>
          <span>Else Branch</span>
        </Render.Else>
      </Render.If>,
    );
    expect(screen.queryByText('Then Branch')).not.toBeInTheDocument();
    expect(screen.getByText('Else Branch')).toBeInTheDocument();
  });

  it('works without Render.Else (renders nothing when false)', () => {
    render(
      <Render.If in={false}>
        <span>Only Then</span>
      </Render.If>,
    );
    expect(screen.queryByText('Only Then')).not.toBeInTheDocument();
  });
});

describe('Render.When', () => {
  it('renders "then" when condition is true', () => {
    render(<Render.When in={true} then="Saving..." otherwise="Save" />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
    expect(screen.queryByText('Save')).not.toBeInTheDocument();
  });

  it('renders "otherwise" when condition is false', () => {
    render(<Render.When in={false} then="Saving..." otherwise="Save" />);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
  });
});
